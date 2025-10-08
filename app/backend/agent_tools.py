import json
import numpy as np
from langchain.tools import Tool
from pycoingecko import CoinGeckoAPI
from quantum_tools import solve_portfolio_qaoa

cg = CoinGeckoAPI()

def _fetch_market_data(assets_string: str) -> str:
    """
    Fetches market data. Input must be a single string of
    comma-separated asset IDs, for example: 'bitcoin,ethereum'
    """
    asset_ids = [asset.strip() for asset in assets_string.split(',')]
    print(f"Fetching market data for: {asset_ids}")
    try:
        all_prices = []
        for asset_id in asset_ids:
            history = cg.get_coin_market_chart_by_id(id=asset_id, vs_currency='usd', days=90)
            prices = [item[1] for item in history['prices']]
            all_prices.append(prices)

        if not all_prices:
            return json.dumps({"status": "error", "message": "Could not fetch any price data."})

        min_len = min(len(p) for p in all_prices)
        all_prices = [p[:min_len] for p in all_prices]
        price_array = np.array(all_prices).T

        if np.any(price_array[:-1] == 0):
            return json.dumps({"status": "error", "message": "Price data contains zero values."})

        daily_returns = np.log(price_array[1:] / price_array[:-1])
        # Annualize for realistic metrics (using 252 trading days)
        expected_returns = np.mean(daily_returns, axis=0) * 252
        covariance_matrix = np.cov(daily_returns.T) * 252

        output = {
            "expected_returns": expected_returns.tolist(),
            "covariance_matrix": covariance_matrix.tolist(),
            "asset_ids": asset_ids
        }
        return json.dumps(output)
    except Exception as e:
        return json.dumps({"status": "error", "message": f"An error occurred: {str(e)}"})

def _run_quantum_optimization(market_data: dict, risk_factor: float, budget: int) -> dict:
    """
    Accepts a dictionary of market data to run the quantum optimization
    and calculate all necessary financial metrics.
    """
    print(f"Starting quantum optimization with risk factor {risk_factor} and budget {budget}...")
    try:
        expected_returns = np.array(market_data["expected_returns"])
        covariance_matrix = np.array(market_data["covariance_matrix"])
        asset_ids = market_data["asset_ids"]

        # Run QAOA optimization
        result = solve_portfolio_qaoa(expected_returns, covariance_matrix, risk_factor, budget)
        allocation_vector = result["optimal_allocation"]
        
        # Create a dictionary of only the selected assets
        final_allocation = {asset: weight for asset, weight in zip(asset_ids, allocation_vector) if weight > 0.5}

        # --- Compute portfolio metrics for the selected assets ---
        selected_indices = [i for i, weight in enumerate(allocation_vector) if weight > 0.5]
        
        if not selected_indices:
             return {"status": "success", "allocation": {}, "metrics": {}}

        # Normalize weights for the selected portfolio
        weights = np.array([allocation_vector[i] for i in selected_indices])
        weights /= np.sum(weights)

        selected_returns = expected_returns[selected_indices]
        selected_cov_matrix = covariance_matrix[np.ix_(selected_indices, selected_indices)]

        # Expected Annual Return
        portfolio_return = np.sum(weights * selected_returns)

        # Annual Volatility (Risk)
        portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(selected_cov_matrix, weights)))

        # Sharpe Ratio (assuming risk-free rate of 2%)
        risk_free_rate = 0.02
        sharpe_ratio = (portfolio_return - risk_free_rate) / portfolio_volatility if portfolio_volatility != 0 else 0

        # Monte Carlo Simulation for potential future outcomes
        num_simulations = 1000
        time_horizon = 252  # 1 year
        
        mean_daily_returns = selected_returns / 252
        cholesky_decomp = np.linalg.cholesky(selected_cov_matrix / 252)
        
        simulated_daily_returns = (np.random.standard_normal((time_horizon, num_simulations, len(selected_indices))) @ cholesky_decomp.T) + mean_daily_returns
        
        simulated_portfolio_returns = np.sum(simulated_daily_returns * weights, axis=2)
        
        # Calculate cumulative returns for each simulation path
        cumulative_returns = np.cumprod(1 + simulated_portfolio_returns, axis=0)[-1] - 1
        
        monte_carlo = {
            "5th_percentile": float(np.percentile(cumulative_returns, 5)),
            "mean_return": float(np.mean(cumulative_returns)),
            "95th_percentile": float(np.percentile(cumulative_returns, 95))
        }

        output = {
            "status": "success",
            "allocation": final_allocation,
            "metrics": {
                "expected_return": float(portfolio_return),
                "volatility": float(portfolio_volatility),
                "sharpe_ratio": float(sharpe_ratio),
                "monte_carlo": monte_carlo
            }
        }
        return output
    except Exception as e:
        import traceback
        print(f"Error in quantum optimization: {traceback.format_exc()}")
        return {"status": "error", "message": f"An error occurred: {str(e)}"}

fetch_market_data_tool = Tool.from_function(
    func=_fetch_market_data,
    name="fetch_market_data",
    description="Fetches 90 days of crypto prices and computes returns/covariance. Input MUST be a single string of comma-separated asset IDs (e.g., 'bitcoin,ethereum')."
)

run_quantum_optimization_tool = Tool.from_function(
    func=_run_quantum_optimization,
    name="run_quantum_optimization",
    description="Run QAOA portfolio optimization and compute financial metrics. Requires a dictionary of market data, a risk factor, and the budget."
)

