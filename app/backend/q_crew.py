import os
import json
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from agent_tools import fetch_market_data_tool, run_quantum_optimization_tool
import ast
# Use the correct, high-performance Groq model
llm = ChatOpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
    model="moonshotai/kimi-k2-instruct-0905", #openai/gpt-oss-120b

    max_retries=5,
)


class CryptoCrew:
    def __init__(self, asset_ids, risk_factor, budget):
        self.asset_ids = asset_ids
        self.risk_factor = risk_factor
        self.budget = budget

    def setup_crew(self):
        # --- AGENTS ---
        market_analyst = Agent(
            role='Cryptocurrency Market Analyst',
            goal=f'Fetch and process market data for {self.asset_ids}.',
            backstory='You are an expert financial data analyst. Your sole job is to use your tool to get data and return it in the exact format required.',
            tools=[fetch_market_data_tool],
            llm=llm,
            verbose=True,
            allow_delegation=False
        )

        quantum_strategist = Agent(
            role='Quantum Optimization Strategist',
            goal=f'Take the market data and IMMEDIATELY use the run_quantum_optimization tool with risk factor {self.risk_factor} and budget {self.budget}.',
            backstory='You are a specialist whose only function is to execute the quantum optimization tool on data you receive.',
            tools=[run_quantum_optimization_tool],
            llm=llm,
            verbose=True,
            allow_delegation=False
        )

        portfolio_advisor = Agent(
            role='AI Financial Advisor',
            goal='Review the final allocation and metrics, then write a professional investment report in Markdown.',
            backstory='You are a seasoned financial advisor who translates quantitative results into actionable advice.',
            llm=llm,
            verbose=True,
            allow_delegation=False
        )

        # --- TASKS ---
        market_data_task = Task(
            description=f"Fetch market data for: {','.join(self.asset_ids)}.",
            expected_output="A single JSON string with three keys: 'asset_ids' (a list of strings), 'expected_returns' (a list of floats), and 'covariance_matrix' (a list of lists of floats). For example: {\"asset_ids\": [\"bitcoin\", \"ethereum\"], \"expected_returns\": [0.12, 0.15], \"covariance_matrix\": [[0.05, 0.02], [0.02, 0.08]]}",
            agent=market_analyst,
        )

        quantum_optimization_task = Task(
            description=f'Use the JSON data from the previous step to perform QAOA. The risk factor is {self.risk_factor} and the budget is {self.budget}.',
            expected_output='The direct, raw JSON string output from the run_quantum_optimization tool, including allocation and metrics.',
            agent=quantum_strategist,
            context=[market_data_task]
        )

        reporting_task = Task(
            description='Analyze the final portfolio allocation and metrics, then create a professional investment report in Markdown format. Include sections for Portfolio Allocation, Expected Return, Volatility, Sharpe Ratio, and Monte Carlo Simulation Results.',
            expected_output='A polished Markdown report with a title, summary, portfolio allocation, and performance metrics (Expected Return, Volatility, Sharpe Ratio, Monte Carlo Simulation).',
            agent=portfolio_advisor,
            context=[quantum_optimization_task]
        )

        return Crew(
            agents=[market_analyst, quantum_strategist, portfolio_advisor],
            tasks=[market_data_task, quantum_optimization_task, reporting_task],
            process=Process.sequential,
            verbose=2
        )

    def run(self):
        crew = self.setup_crew()
        result = crew.kickoff()
        
        # Access the raw string output from the second-to-last task
        optimization_output_str = crew.tasks[-2].output.raw_output
        
        final_output = {
            "report": result, # This is the final markdown report string from the last agent
            "metrics": None,
            "allocation": None
        }

        # ✅ FIX: Use ast.literal_eval for safe parsing of the dictionary-like string
        if optimization_output_str and isinstance(optimization_output_str, str):
            try:
                # ast.literal_eval safely parses a string containing a Python literal (like a dict)
                data = ast.literal_eval(optimization_output_str)
                if isinstance(data, dict) and data.get('status') == 'success':
                    final_output['metrics'] = data.get('metrics')
                    final_output['allocation'] = data.get('allocation')
            except (ValueError, SyntaxError) as e:
                # Fallback for if the string is not a valid Python literal
                print(f"Could not parse metrics from quantum task output. Error: {e}")
                print(f"Raw output was: {optimization_output_str}")
        # Handle the case where the output might already be a dictionary
        elif isinstance(optimization_output_str, dict):
             if optimization_output_str.get('status') == 'success':
                final_output['metrics'] = optimization_output_str.get('metrics')
                final_output['allocation'] = optimization_output_str.get('allocation')

        return final_output

