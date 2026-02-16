"""HTTP client for inter-service communication."""
import httpx
from typing import Dict, Any, Optional
from .logger import get_logger


logger = get_logger(__name__)


class ServiceClient:
    """HTTP client for making requests to other services."""
    
    def __init__(self, base_url: str, timeout: float = 30.0):
        """
        Initialize the service client.
        
        Args:
            base_url: Base URL of the service
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout)
    
    async def get(self, endpoint: str, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make a GET request."""
        url = f"{self.base_url}{endpoint}"
        logger.info(f"GET request to {url}")
        
        response = await self.client.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    
    async def post(
        self, 
        endpoint: str, 
        data: Dict[str, Any], 
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Make a POST request."""
        url = f"{self.base_url}{endpoint}"
        logger.info(f"POST request to {url}")
        
        response = await self.client.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()
    
    async def put(
        self, 
        endpoint: str, 
        data: Dict[str, Any], 
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Make a PUT request."""
        url = f"{self.base_url}{endpoint}"
        logger.info(f"PUT request to {url}")
        
        response = await self.client.put(url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()
    
    async def delete(self, endpoint: str, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make a DELETE request."""
        url = f"{self.base_url}{endpoint}"
        logger.info(f"DELETE request to {url}")
        
        response = await self.client.delete(url, headers=headers)
        response.raise_for_status()
        return response.json()
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
