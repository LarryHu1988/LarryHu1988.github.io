#!/usr/bin/env python3
"""Fetch upcoming fixtures from API-FOOTBALL and write data/sports.json."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_URL = "https://v3.football.api-sports.io/fixtures"
TIMEZONE = "Asia/Shanghai"
NEXT_MATCHES = 5
TEAMS = {
    "barca": {"team_id": 529, "name": "Barcelona"},
    "messi": {"team_id": 9568, "name": "Inter Miami"},
}


def fetch_json(url: str, headers: Dict[str, str]) -> Dict[str, Any]:
    request = Request(url, headers=headers)
    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def normalize_fixture(item: Dict[str, Any], team_id: int) -> Dict[str, Any] | None:
    fixture = item.get("fixture") or {}
    league = item.get("league") or {}
    teams = item.get("teams") or {}
    home = teams.get("home") or {}
    away = teams.get("away") or {}

    fixture_date = fixture.get("date")
    if not fixture_date:
        return None

    home_id = home.get("id")
    is_home = home_id == team_id

    opponent = away.get("name") if is_home else home.get("name")
    if not opponent:
        return None

    league_name = league.get("name") or ""
    league_round = league.get("round") or ""
    league_display = f"{league_name} · {league_round}" if league_name and league_round else league_name

    return {
        "date": fixture_date,
        "opponent": opponent,
        "league": league_display,
        "is_home": bool(is_home),
    }


def fetch_team_fixtures(api_key: str, team_id: int) -> List[Dict[str, Any]]:
    params = urlencode({"team": team_id, "next": NEXT_MATCHES, "timezone": TIMEZONE})
    url = f"{API_URL}?{params}"
    headers = {
        "x-apisports-key": api_key,
        "accept": "application/json",
    }

    payload = fetch_json(url, headers)
    fixtures = payload.get("response") or []

    normalized: List[Dict[str, Any]] = []
    for item in fixtures:
        parsed = normalize_fixture(item, team_id)
        if parsed is not None:
            normalized.append(parsed)

    return normalized


def main() -> int:
    api_key = os.getenv("APIFOOTBALL_API_KEY", "").strip()
    if not api_key:
        print("APIFOOTBALL_API_KEY is required.", file=sys.stderr)
        return 1

    result: Dict[str, Any] = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": "api-football",
        "timezone": TIMEZONE,
    }

    try:
        for key, config in TEAMS.items():
            result[key] = fetch_team_fixtures(api_key, config["team_id"])
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to fetch sports data: {exc}", file=sys.stderr)
        return 1

    repo_root = Path(__file__).resolve().parents[1]
    output_path = repo_root / "data" / "sports.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
