import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';

/**
 * Verification script to diagnose VES balance discrepancies
 * Run with: npm run verify-ves
 */

async function verifyVESBalance() {
  console.log('='.repeat(60));
  console.log('VES BALANCE VERIFICATION');
  console.log('='.repeat(60));

  const client = await pool.connect();

  try {
    // 1. Get raw conversion data
    console.log('\n📊 CONVERSIONS (USDT → VES):');
    console.log('-'.repeat(60));

    const conversions = await client.query(
      `SELECT
        id,
        date,
        usdt_amount,
        ves_received,
        exchange_rate,
        (usdt_amount * exchange_rate) as calculated_ves,
        ves_received - (usdt_amount * exchange_rate) as rounding_diff
       FROM conversions
       ORDER BY date DESC
       LIMIT 10`
    );

    console.log('Recent conversions:');
    conversions.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.usdt_amount} USDT × ${row.exchange_rate} = ${row.ves_received} VES`);
      console.log(`    Calculated: ${row.calculated_ves}, Rounding diff: ${row.rounding_diff}`);
    });

    const conversionSum = await client.query(
      'SELECT COALESCE(SUM(ves_received), 0) as total FROM conversions'
    );
    const totalVESConverted = conversionSum.rows[0].total;
    console.log(`\n  Total VES Converted: ${totalVESConverted}`);
    console.log(`  Type: ${typeof totalVESConverted}`);
    console.log(`  parseInt(): ${parseInt(totalVESConverted, 10)}`);

    // 2. Get raw VES order data
    console.log('\n📤 VES ORDERS (Completed):');
    console.log('-'.repeat(60));

    const vesOrders = await client.query(
      `SELECT
        id,
        customer_name,
        amount_ves,
        exchange_rate,
        usdt_sold,
        (amount_ves / NULLIF(exchange_rate, 0)) as calculated_usdt,
        usdt_sold - (amount_ves / NULLIF(exchange_rate, 0)) as calc_diff,
        status,
        date_completed
       FROM ves_orders
       WHERE status = 'COMPLETED'
       ORDER BY date_completed DESC
       LIMIT 10`
    );

    console.log('Recent completed orders:');
    vesOrders.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.customer_name}`);
      console.log(`    ${row.amount_ves} VES ÷ ${row.exchange_rate} = ${row.usdt_sold} USDT`);
      console.log(`    Calculated USDT: ${row.calculated_usdt}, Diff: ${row.calc_diff}`);
    });

    const orderSum = await client.query(
      `SELECT COALESCE(SUM(amount_ves), 0) as total
       FROM ves_orders
       WHERE status = 'COMPLETED'`
    );
    const totalVESSold = orderSum.rows[0].total;
    console.log(`\n  Total VES Sold: ${totalVESSold}`);
    console.log(`  Type: ${typeof totalVESSold}`);
    console.log(`  parseInt(): ${parseInt(totalVESSold, 10)}`);

    // 3. Get pending orders
    const pendingSum = await client.query(
      `SELECT COALESCE(SUM(amount_ves), 0) as total
       FROM ves_orders
       WHERE status = 'PENDING'`
    );
    const totalVESPending = pendingSum.rows[0].total;
    console.log(`\n  Total VES Pending: ${totalVESPending}`);

    // 4. Calculate balance using raw SQL
    console.log('\n💰 BALANCE CALCULATION:');
    console.log('-'.repeat(60));

    const manualCalc = parseInt(totalVESConverted, 10) - parseInt(totalVESSold, 10);
    console.log(`  Manual calculation:`);
    console.log(`    ${totalVESConverted} (converted) - ${totalVESSold} (sold) = ${manualCalc} VES`);

    // 5. Get balance from service
    const serviceBalance = await BalanceService.getDaiVESBalance();
    console.log(`\n  Service calculation: ${serviceBalance} VES`);

    // 6. Compare
    console.log('\n🔍 COMPARISON:');
    console.log('-'.repeat(60));
    const diff = manualCalc - serviceBalance;
    if (diff === 0) {
      console.log(`  ✅ Balance calculations MATCH! (${serviceBalance} VES)`);
    } else {
      console.log(`  ❌ DISCREPANCY FOUND!`);
      console.log(`     Manual calc: ${manualCalc} VES`);
      console.log(`     Service calc: ${serviceBalance} VES`);
      console.log(`     Difference: ${diff} VES`);
    }

    // 7. Check for any CANCELLED orders that might be miscounted
    const cancelledSum = await client.query(
      `SELECT COALESCE(SUM(amount_ves), 0) as total
       FROM ves_orders
       WHERE status = 'CANCELLED'`
    );
    const totalCancelled = cancelledSum.rows[0].total;
    if (parseInt(totalCancelled, 10) > 0) {
      console.log(`\n  ⚠️  Note: ${totalCancelled} VES in CANCELLED orders (should not affect balance)`);
    }

    // 8. Summary statistics
    console.log('\n📈 SUMMARY:');
    console.log('-'.repeat(60));
    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM conversions) as total_conversions,
        (SELECT COUNT(*) FROM ves_orders WHERE status = 'COMPLETED') as completed_orders,
        (SELECT COUNT(*) FROM ves_orders WHERE status = 'PENDING') as pending_orders,
        (SELECT COUNT(*) FROM ves_orders WHERE status = 'CANCELLED') as cancelled_orders
    `);
    console.log(`  Total conversions: ${stats.rows[0].total_conversions}`);
    console.log(`  Completed VES orders: ${stats.rows[0].completed_orders}`);
    console.log(`  Pending VES orders: ${stats.rows[0].pending_orders}`);
    console.log(`  Cancelled VES orders: ${stats.rows[0].cancelled_orders}`);

    // 9. Check for data type issues
    console.log('\n🔧 DATA TYPE VERIFICATION:');
    console.log('-'.repeat(60));
    const typeCheck = await client.query(`
      SELECT
        column_name,
        data_type,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name IN ('conversions', 'ves_orders')
        AND column_name IN ('ves_received', 'amount_ves')
      ORDER BY table_name, column_name
    `);
    typeCheck.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type}): precision=${row.numeric_precision}, scale=${row.numeric_scale}`);
    });

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the verification
verifyVESBalance()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
