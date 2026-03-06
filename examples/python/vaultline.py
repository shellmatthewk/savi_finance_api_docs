"""
VaultLine API Client

Usage:
    client = VaultLine('vl_your_api_key')
    rates = client.get_rates(['BTC/USD', 'ETH/USD'])
"""

import requests
from dataclasses import dataclass
from typing import Optional


@dataclass
class RateLimit:
    limit: int
    remaining: int
    reset: int


class VaultLineError(Exception):
    """API error with status code and message"""
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"[{status_code}] {message}")


class VaultLine:
    def __init__(self, api_key: str, base_url: str = "https://api.vaultline.io/api/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}"
        })
        self.rate_limit: Optional[RateLimit] = None

    def _request(self, endpoint: str, params: dict = None) -> dict:
        """Make an API request and return JSON response"""
        response = self.session.get(f"{self.base_url}{endpoint}", params=params)

        # Extract rate limit info
        self.rate_limit = RateLimit(
            limit=int(response.headers.get("X-RateLimit-Limit", 0)),
            remaining=int(response.headers.get("X-RateLimit-Remaining", 0)),
            reset=int(response.headers.get("X-RateLimit-Reset", 0)),
        )

        if not response.ok:
            error = response.json()
            raise VaultLineError(
                response.status_code,
                error.get("message") or error.get("error") or f"HTTP {response.status_code}"
            )

        return response.json()

    def get_assets(self, asset_class: str = None) -> dict:
        """
        Get available symbols grouped by asset class

        Args:
            asset_class: Filter by 'fiat', 'crypto', 'stocks', or 'metals'

        Returns:
            dict with asset_classes and total_symbols
        """
        params = {}
        if asset_class:
            params["asset_class"] = asset_class
        return self._request("/assets", params)

    def get_rates(self, symbols: list[str], date: str = None) -> dict:
        """
        Get current rates for symbols

        Args:
            symbols: List of symbols, e.g. ['BTC/USD', 'AAPL']
            date: Optional ISO date (YYYY-MM-DD)

        Returns:
            dict with data array of rates
        """
        params = {"symbols": ",".join(symbols)}
        if date:
            params["date"] = date
        return self._request("/rates", params)

    def get_history(self, symbol: str, from_date: str, to_date: str) -> dict:
        """
        Get historical rates for a symbol

        Args:
            symbol: Symbol, e.g. 'BTC/USD'
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            dict with symbol info and history array
        """
        return self._request("/rates/history", {
            "symbol": symbol,
            "from": from_date,
            "to": to_date,
        })


# Example usage
if __name__ == "__main__":
    from datetime import datetime, timedelta

    client = VaultLine("vl_your_api_key_here")

    # Get all available assets
    assets = client.get_assets()
    print(f"Available assets: {assets['total_symbols']}")

    # Get crypto assets only
    crypto = client.get_assets("crypto")
    print(f"Crypto symbols: {crypto['asset_classes'][0]['symbols'][:5]}...")

    # Get current rates
    rates = client.get_rates(["BTC/USD", "ETH/USD", "AAPL"])
    for rate in rates["data"]:
        print(f"{rate['symbol']}: {rate['rate']}")

    print(f"API calls remaining: {client.rate_limit.remaining}")

    # Get historical data (last 30 days)
    to_date = datetime.now().strftime("%Y-%m-%d")
    from_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    history = client.get_history("BTC/USD", from_date, to_date)
    print(f"History points: {len(history['history'])}")
