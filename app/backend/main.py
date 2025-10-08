import asyncio
import threading
import time
from typing import List
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import Litestar and related components
from litestar import Litestar, post, get
from litestar.config.cors import CORSConfig
from uvicorn import Config, Server
import msgspec

from q_crew import CryptoCrew

# Define request data structure using MsgSpec
class OptimizationRequest(msgspec.Struct):
    asset_ids: List[str]
    risk_factor: float
    budget: int

# Configure CORS to allow frontend origin
cors_config = CORSConfig(allow_origins=["http://localhost:3000"], allow_methods=["GET", "POST"], allow_headers=["*"])

# Define Litestar route handlers
@get("/")
async def read_root() -> dict:
    return {"message": "Q-OptiFolio Litestar API is running! Send a POST request to /optimize."}

@post("/optimize")
async def optimize_portfolio(data: OptimizationRequest) -> dict:
    print("Received request. Initializing Crew...")
    crew_instance = CryptoCrew(
        asset_ids=data.asset_ids,
        risk_factor=data.risk_factor,
        budget=data.budget
    )
    try:
        # The run() method now returns a complete dictionary ready for the frontend
        result_dict = crew_instance.run()
        print("Crew execution finished. Returning result.")
        
        # The result is already a dictionary, so we return it with a success status
        return {"status": "success", **result_dict}
        
    except Exception as e:
        import traceback
        print(f"❌ Error in /optimize: {traceback.format_exc()}")
        return {"status": "error", "message": str(e)}

# Instantiate the Litestar app
app = Litestar(route_handlers=[read_root, optimize_portfolio], cors_config=cors_config)

# Use the robust asyncio.run method for starting the server in a thread
def run_server():
    config = Config(app=app, host="0.0.0.0", port=8000)
    server = Server(config)
    asyncio.run(server.serve())

# Start the server when the script is run
if __name__ == "__main__":
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    print("✅ Litestar server thread started on http://localhost:8000")
    # Keep the main thread alive to allow the daemon thread to run
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down server...")

