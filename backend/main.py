import uvicorn
from api.app import app
from config import SERVER_PORT, SERVER_HOST

if __name__ == "__main__":
    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT) 