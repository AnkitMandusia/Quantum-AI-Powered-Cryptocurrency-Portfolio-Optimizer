import numpy as np
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.algorithms import MinimumEigenOptimizer
#from qiskit.primitives import StatevectorEstimator
from qiskit.primitives import StatevectorSampler
from qiskit_algorithms import QAOA
from qiskit_algorithms.optimizers import COBYLA

def solve_portfolio_qaoa(expected_returns, covariance_matrix, risk_factor, budget):
    """
    Constructs and solves the portfolio optimization problem directly
    using QuadraticProgram. This is the modern, robust method.
    """
    print("Initializing Quantum Portfolio Optimizer...")
    num_assets = len(expected_returns)
    
    qp = QuadraticProgram('portfolio_optimization')
    qp.binary_var_list(num_assets, name='x')

    linear_objective = -np.array(expected_returns)
    quadratic_objective = risk_factor * np.array(covariance_matrix)
    qp.minimize(linear=linear_objective, quadratic=quadratic_objective)

    qp.linear_constraint(linear=np.ones(num_assets), sense='==', rhs=budget, name='budget_constraint')
    print("Successfully formulated the Quadratic Program.")

    # ✅ FIX: The Sampler from qiskit_aer does not take a 'backend' argument.
    # It automatically uses the high-performance Aer simulator.
    sampler = StatevectorSampler()

	

    optimizer = COBYLA(maxiter=50)
    qaoa = QAOA(optimizer=optimizer, reps=1, sampler=sampler)
    qaoa_optimizer = MinimumEigenOptimizer(qaoa)

    print("Running QAOA on the simulator... This may take a moment.")
    result = qaoa_optimizer.solve(qp)
    print("QAOA execution finished.")

    allocation = result.x
    optimal_value = result.fval

    return {
        "optimal_allocation": allocation.tolist(),
        "optimal_value": optimal_value,
        "raw_result": str(result)
    }

