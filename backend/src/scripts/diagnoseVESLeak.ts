import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';

/**
 * Enhanced diagnostic script to find the source of VES balance discrepancies
 * Run with: npm run diagnose-ves
 */

async function diagnoseVESLeak() {
  console.log('='.repeat(80));
  console.log('VES BALANCE LEAK DIAGNOSTIC');
  console.log('='.repeat(80));

  const client = await pool.connect();

  try {
    // 1. Get current balances
    console.log('\n📊 CURRENT BALANCE:');
    console.log('-'.repeat(80));

    const serviceBalance = await BalanceService.getDaiVESBalance();
    console.log(`  Balance from Service: ${serviceBalance.toLocaleString()} VES`);

    // Get raw calculation
    const rawBalance = await client.query(`
      SELECT
        COALESCE((SELECT SUM(ves_received) FROM conversions), 0) as total_converted,
        COALESCE((SELECT SUM(amount_ves) FROM ves_orders WHERE status = 'COMPLETED'), 0) as total_sold,
        COALESCE((SELECT SUM(ves_received) FROM conversions), 0) -
        COALESCE((SELECT SUM(amount_ves) FROM ves_orders WHERE status = 'COMPLETED'), 0) as calculated_balance
    `);

    const totalConverted = parseInt(rawBalance.rows[0].total_converted);
    const totalSold = parseInt(rawBalance.rows[0].total_sold);
    const calculatedBalance = parseInt(rawBalance.rows[0].calculated_balance);

    console.log(`  Total VES Converted: ${totalConverted.toLocaleString()} VES`);
    console.log(`  Total VES Sold: ${totalSold.toLocaleString()} VES`);
    console.log(`  Calculated Balance: ${calculatedBalance.toLocaleString()} VES`);
    console.log(`  Difference: ${(serviceBalance - calculatedBalance).toLocaleString()} VES`);

    // 2. Check for data integrity issues
    console.log('\n🔍 DATA INTEGRITY CHECKS:');
    console.log('-'.repeat(80));

    // Check for completed orders without exchange_rate or usdt_sold
    const missingData = await client.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount_ves), 0) as total_ves
      FROM ves_orders
      WHERE status = 'COMPLETED'
        AND (exchange_rate IS NULL OR usdt_sold IS NULL OR exchange_rate = 0)
    `);

    if (parseInt(missingData.rows[0].count) > 0) {
      console.log(`  ❌ FOUND ${missingData.rows[0].count} completed orders missing exchange_rate/usdt_sold`);
      console.log(`     Total VES affected: ${parseInt(missingData.rows[0].total_ves).toLocaleString()}`);

      // Show the problematic orders
      const problemOrders = await client.query(`
        SELECT id, customer_name, amount_ves, status, exchange_rate, usdt_sold, date_completed
        FROM ves_orders
        WHERE status = 'COMPLETED'
          AND (exchange_rate IS NULL OR usdt_sold IS NULL OR exchange_rate = 0)
        ORDER BY date_completed DESC
        LIMIT 10
      `);

      console.log('\n     Problematic orders:');
      problemOrders.rows.forEach(row => {
        console.log(`       Order ${row.id}: ${row.amount_ves.toLocaleString()} VES, rate=${row.exchange_rate}, usdt=${row.usdt_sold}`);
      });
    } else {
      console.log(`  ✅ All completed orders have exchange_rate and usdt_sold`);
    }

    // Check for cancelled/pending being miscounted
    const statusCheck = await client.query(`
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(amount_ves), 0) as total_ves
      FROM ves_orders
      GROUP BY status
    `);

    console.log('\n  Order status breakdown:');
    statusCheck.rows.forEach(row => {
      console.log(`    ${row.status}: ${row.count} orders, ${parseInt(row.total_ves).toLocaleString()} VES`);
    });

    // 3. Check conversion rounding impact
    console.log('\n🔢 CONVERSION ROUNDING ANALYSIS:');
    console.log('-'.repeat(80));

    const roundingImpact = await client.query(`
      SELECT
        COUNT(*) as total_conversions,
        SUM(ves_received) as total_ves_received,
        SUM(usdt_amount * exchange_rate) as calculated_ves,
        SUM(ves_received - (usdt_amount * exchange_rate)) as total_rounding_diff,
        AVG(ves_received - (usdt_amount * exchange_rate)) as avg_rounding_diff
      FROM conversions
    `);

    const roundingDiff = parseFloat(roundingImpact.rows[0].total_rounding_diff || 0);
    console.log(`  Total conversions: ${roundingImpact.rows[0].total_conversions}`);
    console.log(`  Total rounding difference: ${roundingDiff.toLocaleString()} VES`);
    console.log(`  Average rounding per conversion: ${parseFloat(roundingImpact.rows[0].avg_rounding_diff || 0).toFixed(2)} VES`);

    if (Math.abs(roundingDiff) > 1000) {
      console.log(`  ⚠️  Rounding accumulation: ${roundingDiff.toLocaleString()} VES`);
    }

    // 4. Day-by-day analysis of recent activity
    console.log('\n📅 DAILY ACTIVITY (Last 7 days):');
    console.log('-'.repeat(80));

    const dailyActivity = await client.query(`
      WITH daily_conversions AS (
        SELECT
          DATE(date) as day,
          COUNT(*) as conversion_count,
          SUM(ves_received) as ves_added
        FROM conversions
        WHERE date >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(date)
      ),
      daily_orders AS (
        SELECT
          DATE(date_completed) as day,
          COUNT(*) as order_count,
          SUM(amount_ves) as ves_sold
        FROM ves_orders
        WHERE status = 'COMPLETED'
          AND date_completed >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(date_completed)
      )
      SELECT
        COALESCE(dc.day, do_.day) as day,
        COALESCE(dc.conversion_count, 0) as conversions,
        COALESCE(dc.ves_added, 0) as ves_added,
        COALESCE(do_.order_count, 0) as orders_fulfilled,
        COALESCE(do_.ves_sold, 0) as ves_sold,
        COALESCE(dc.ves_added, 0) - COALESCE(do_.ves_sold, 0) as net_change
      FROM daily_conversions dc
      FULL OUTER JOIN daily_orders do_ ON dc.day = do_.day
      ORDER BY day DESC
    `);

    console.log('  Date       | Conversions | VES Added  | Orders | VES Sold   | Net Change');
    console.log('  ' + '-'.repeat(76));
    dailyActivity.rows.forEach(row => {
      const day = row.day ? new Date(row.day).toISOString().split('T')[0] : 'N/A';
      const conversions = row.conversions || 0;
      const vesAdded = parseInt(row.ves_added || 0);
      const orders = row.orders_fulfilled || 0;
      const vesSold = parseInt(row.ves_sold || 0);
      const netChange = parseInt(row.net_change || 0);

      console.log(`  ${day} | ${conversions.toString().padEnd(11)} | ${vesAdded.toLocaleString().padEnd(10)} | ${orders.toString().padEnd(6)} | ${vesSold.toLocaleString().padEnd(10)} | ${netChange.toLocaleString()}`);
    });

    // 5. Check for duplicate transactions
    console.log('\n🔄 DUPLICATE DETECTION:');
    console.log('-'.repeat(80));

    const duplicateConversions = await client.query(`
      SELECT
        date, usdt_amount, ves_received, exchange_rate, COUNT(*) as count
      FROM conversions
      GROUP BY date, usdt_amount, ves_received, exchange_rate
      HAVING COUNT(*) > 1
      ORDER BY date DESC
      LIMIT 10
    `);

    if (duplicateConversions.rows.length > 0) {
      console.log(`  ⚠️  Found ${duplicateConversions.rows.length} potential duplicate conversions:`);
      duplicateConversions.rows.forEach(row => {
        console.log(`    ${row.date}: ${row.usdt_amount} USDT → ${row.ves_received} VES (${row.count}x)`);
      });
    } else {
      console.log(`  ✅ No duplicate conversions detected`);
    }

    const duplicateOrders = await client.query(`
      SELECT
        customer_name, amount_ves, date_submitted, COUNT(*) as count
      FROM ves_orders
      WHERE status = 'COMPLETED'
      GROUP BY customer_name, amount_ves, date_submitted
      HAVING COUNT(*) > 1
      ORDER BY date_submitted DESC
      LIMIT 10
    `);

    if (duplicateOrders.rows.length > 0) {
      console.log(`  ⚠️  Found ${duplicateOrders.rows.length} potential duplicate orders:`);
      duplicateOrders.rows.forEach(row => {
        console.log(`    ${row.customer_name}: ${row.amount_ves} VES on ${row.date_submitted} (${row.count}x)`);
      });
    } else {
      console.log(`  ✅ No duplicate orders detected`);
    }

    // 6. Check USDT calculation accuracy on fulfilled orders
    console.log('\n💱 EXCHANGE RATE VERIFICATION (Recent Orders):');
    console.log('-'.repeat(80));

    const exchangeRateCheck = await client.query(`
      SELECT
        id,
        customer_name,
        amount_ves,
        exchange_rate,
        usdt_sold,
        (amount_ves::numeric / NULLIF(exchange_rate, 0)) as calculated_usdt,
        usdt_sold - (amount_ves::numeric / NULLIF(exchange_rate, 0)) as usdt_diff
      FROM ves_orders
      WHERE status = 'COMPLETED'
        AND exchange_rate > 0
      ORDER BY date_completed DESC
      LIMIT 10
    `);

    console.log('  Recent completed orders:');
    console.log('  ID   | Customer       | VES Amount  | Rate     | USDT Sold | Calc USDT | Diff');
    console.log('  ' + '-'.repeat(76));

    let totalUsdtDiff = 0;
    exchangeRateCheck.rows.forEach(row => {
      const usdtDiff = parseFloat(row.usdt_diff || 0);
      totalUsdtDiff += Math.abs(usdtDiff);
      const diffStr = Math.abs(usdtDiff) > 0.01 ? `⚠️ ${usdtDiff.toFixed(2)}` : '✓';

      console.log(`  ${row.id.toString().padEnd(4)} | ${row.customer_name.substring(0, 14).padEnd(14)} | ${parseInt(row.amount_ves).toLocaleString().padEnd(11)} | ${parseFloat(row.exchange_rate).toFixed(2).padEnd(8)} | ${parseFloat(row.usdt_sold).toFixed(2).padEnd(9)} | ${parseFloat(row.calculated_usdt).toFixed(2).padEnd(9)} | ${diffStr}`);
    });

    if (totalUsdtDiff > 0.1) {
      console.log(`\n  ⚠️  Total USDT calculation difference: $${totalUsdtDiff.toFixed(2)}`);
    }

    // 7. Timeline of balance changes
    console.log('\n📈 BALANCE EVOLUTION:');
    console.log('-'.repeat(80));

    const balanceHistory = await client.query(`
      WITH all_events AS (
        SELECT
          date as event_date,
          'CONVERSION' as event_type,
          ves_received as ves_change,
          id
        FROM conversions

        UNION ALL

        SELECT
          date_completed as event_date,
          'ORDER_COMPLETED' as event_type,
          -amount_ves as ves_change,
          id
        FROM ves_orders
        WHERE status = 'COMPLETED' AND date_completed IS NOT NULL
      )
      SELECT
        event_date,
        event_type,
        ves_change,
        SUM(ves_change) OVER (ORDER BY event_date) as running_balance
      FROM all_events
      ORDER BY event_date DESC
      LIMIT 20
    `);

    console.log('  Date/Time           | Type             | VES Change     | Running Balance');
    console.log('  ' + '-'.repeat(76));
    balanceHistory.rows.forEach(row => {
      const date = new Date(row.event_date).toISOString().substring(0, 19);
      const type = row.event_type.padEnd(16);
      const change = parseInt(row.ves_change).toLocaleString().padStart(13);
      const balance = parseInt(row.running_balance).toLocaleString().padStart(15);

      console.log(`  ${date} | ${type} | ${change} | ${balance}`);
    });

    // 8. Summary and recommendations
    console.log('\n' + '='.repeat(80));
    console.log('DIAGNOSTIC SUMMARY:');
    console.log('='.repeat(80));

    const issues = [];

    if (parseInt(missingData.rows[0].count) > 0) {
      issues.push(`❌ ${missingData.rows[0].count} completed orders missing exchange rate data`);
    }

    if (Math.abs(roundingDiff) > 1000) {
      issues.push(`⚠️  Rounding accumulation: ${roundingDiff.toLocaleString()} VES`);
    }

    if (duplicateConversions.rows.length > 0) {
      issues.push(`⚠️  ${duplicateConversions.rows.length} potential duplicate conversions`);
    }

    if (duplicateOrders.rows.length > 0) {
      issues.push(`⚠️  ${duplicateOrders.rows.length} potential duplicate orders`);
    }

    if (Math.abs(serviceBalance - calculatedBalance) > 0) {
      issues.push(`⚠️  ${Math.abs(serviceBalance - calculatedBalance).toLocaleString()} VES difference between service and manual calculation`);
    }

    if (issues.length > 0) {
      console.log('\n❌ ISSUES FOUND:');
      issues.forEach(issue => console.log(`  ${issue}`));
    } else {
      console.log('\n✅ No issues detected - balance calculations appear correct');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the diagnosis
diagnoseVESLeak()
  .then(() => {
    console.log('\n✅ Diagnosis complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Diagnosis failed:', err);
    process.exit(1);
  });
