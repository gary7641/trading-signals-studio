// ==========================================
// FX CALCULATORS MODULE
// Collection of 12 Forex trading calculators
// ==========================================

const FXCalculators = {
    // 1. Position Size Calculator
    calculatePositionSize: function(accountBalance, riskPercentage, stopLossPips, pipValue) {
        const riskAmount = (accountBalance * riskPercentage) / 100;
        const positionSize = riskAmount / (stopLossPips * pipValue);
        return {
            positionSize: positionSize.toFixed(2),
            riskAmount: riskAmount.toFixed(2),
            lots: (positionSize / 100000).toFixed(2)
        };
    },

    // 2. Pip Calculator
    calculatePipValue: function(currencyPair, accountCurrency, lotSize, exchangeRate = 1) {
        // Standard lot = 100,000 units
        const pipInDecimals = currencyPair.includes('JPY') ? 0.01 : 0.0001;
        const pipValue = (pipInDecimals * lotSize * 100000) / exchangeRate;
        return {
            pipValue: pipValue.toFixed(5),
            pipInDecimals: pipInDecimals
        };
    },

    // 3. Profit/Loss Calculator
    calculateProfitLoss: function(entryPrice, exitPrice, lotSize, direction) {
        const priceDifference = direction === 'buy' ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
        const pips = priceDifference / 0.0001; // Assuming 4-decimal currency
        const profit = pips * lotSize * 10; // Simplified calculation
        return {
            pips: pips.toFixed(1),
            profitLoss: profit.toFixed(2),
            percentage: ((profit / (entryPrice * lotSize * 100000)) * 100).toFixed(2)
        };
    },

    // 4. Margin Calculator
    calculateMargin: function(lotSize, leverage, currencyPrice) {
        const contractSize = lotSize * 100000;
        const margin = (contractSize * currencyPrice) / leverage;
        return {
            margin: margin.toFixed(2),
            contractSize: contractSize,
            freeMargin: 0 // Would need account balance
        };
    },

    // 5. Fibonacci Calculator
    calculateFibonacci: function(high, low, direction = 'retracement') {
        const diff = high - low;
        const levels = {
            '0%': direction === 'retracement' ? high : low,
            '23.6%': direction === 'retracement' ? high - (diff * 0.236) : low + (diff * 0.236),
            '38.2%': direction === 'retracement' ? high - (diff * 0.382) : low + (diff * 0.382),
            '50%': direction === 'retracement' ? high - (diff * 0.5) : low + (diff * 0.5),
            '61.8%': direction === 'retracement' ? high - (diff * 0.618) : low + (diff * 0.618),
            '78.6%': direction === 'retracement' ? high - (diff * 0.786) : low + (diff * 0.786),
            '100%': direction === 'retracement' ? low : high
        };
        return levels;
    },

    // 6. Pivot Points Calculator
    calculatePivotPoints: function(high, low, close) {
        const pivot = (high + low + close) / 3;
        return {
            pivot: pivot.toFixed(5),
            r1: (2 * pivot - low).toFixed(5),
            r2: (pivot + (high - low)).toFixed(5),
            r3: (high + 2 * (pivot - low)).toFixed(5),
            s1: (2 * pivot - high).toFixed(5),
            s2: (pivot - (high - low)).toFixed(5),
            s3: (low - 2 * (high - pivot)).toFixed(5)
        };
    },

    // 7. Lot Size Calculator
    calculateLotSize: function(accountBalance, riskPercentage, stopLossPips, pipValue) {
        const riskAmount = (accountBalance * riskPercentage) / 100;
        const lotSize = riskAmount / (stopLossPips * pipValue);
        return {
            standardLots: lotSize.toFixed(2),
            miniLots: (lotSize * 10).toFixed(2),
            microLots: (lotSize * 100).toFixed(2)
        };
    },

    // 8. Currency Converter
    convertCurrency: function(amount, fromCurrency, toCurrency, exchangeRate) {
        const converted = amount * exchangeRate;
        return {
            originalAmount: amount,
            convertedAmount: converted.toFixed(2),
            exchangeRate: exchangeRate,
            fromCurrency: fromCurrency,
            toCurrency: toCurrency
        };
    },

    // 9. Risk/Reward Calculator
    calculateRiskReward: function(entryPrice, stopLoss, takeProfit) {
        const risk = Math.abs(entryPrice - stopLoss);
        const reward = Math.abs(takeProfit - entryPrice);
        const ratio = reward / risk;
        return {
            risk: risk.toFixed(5),
            reward: reward.toFixed(5),
            ratio: ratio.toFixed(2),
            isGoodTrade: ratio >= 2
        };
    },

    // 10. Swap Calculator
    calculateSwap: function(lotSize, longSwapRate, shortSwapRate, days, direction) {
        const swapRate = direction === 'long' ? longSwapRate : shortSwapRate;
        const swapCost = lotSize * swapRate * days;
        return {
            swapCost: swapCost.toFixed(2),
            dailySwap: (swapCost / days).toFixed(2),
            direction: direction
        };
    },

    // 11. Volatility Calculator
    calculateVolatility: function(prices) {
        const n = prices.length;
        const mean = prices.reduce((a, b) => a + b, 0) / n;
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        return {
            mean: mean.toFixed(5),
            standardDeviation: stdDev.toFixed(5),
            variance: variance.toFixed(5),
            volatilityPercent: ((stdDev / mean) * 100).toFixed(2)
        };
    },

    // 12. Correlation Calculator
    calculateCorrelation: function(prices1, prices2) {
        const n = prices1.length;
        const mean1 = prices1.reduce((a, b) => a + b, 0) / n;
        const mean2 = prices2.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let sum1 = 0;
        let sum2 = 0;
        
        for (let i = 0; i < n; i++) {
            const diff1 = prices1[i] - mean1;
            const diff2 = prices2[i] - mean2;
            numerator += diff1 * diff2;
            sum1 += diff1 * diff1;
            sum2 += diff2 * diff2;
        }
        
        const correlation = numerator / Math.sqrt(sum1 * sum2);
        return {
            correlation: correlation.toFixed(4),
            strength: Math.abs(correlation) > 0.7 ? 'Strong' : Math.abs(correlation) > 0.4 ? 'Moderate' : 'Weak',
            direction: correlation > 0 ? 'Positive' : 'Negative'
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FXCalculators;
}
