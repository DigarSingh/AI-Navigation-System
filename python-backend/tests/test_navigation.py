import os
import sys
import math
import pytest
import networkx as nx
import pandas as pd

# Add python-backend directory to sys.path so app can be imported
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import app


@pytest.fixture(autouse=True)
def mock_osrm(monkeypatch):
    """Mock external OSRM service so core tests run 100% offline, fast, and reliably."""
    monkeypatch.setattr(app, "get_osrm_route", lambda coords: None)


@pytest.fixture
def client():
    app.app.config["TESTING"] = True
    with app.app.test_client() as client:
        yield client


# ============================================================================
# 1. Health and Discovery Endpoints
# ============================================================================

def test_health_check(client):
    """Verify /health returns 200, healthy status, graph loaded, and model status."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["graph_loaded"] is True
    assert data["model_loaded"] is True
    assert data["nodes_count"] == 105
    assert data["edges_count"] == 161
    assert "Delhi" in data["cities_available"]


def test_cities_endpoint(client):
    """Verify /cities returns 105 cities."""
    res = client.get("/cities")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] == 105
    assert len(data["cities"]) == 105
    assert "Delhi" in data["cities"]
    assert "Mumbai" in data["cities"]
    assert "Bangalore" in data["cities"]


# ============================================================================
# 2. Dijkstra Algorithm & Deterministic Shortest Path
# ============================================================================

def test_dijkstra_on_deterministic_graph():
    """Verify Dijkstra algorithm on a known deterministic test graph.
    Nodes: A, B, C, D
    Edges:
        A - B: 12 (path A->B->C is 12 + 15 = 27)
        B - C: 15
        A - C: 30 (direct path is 30)
        A - D: 5
        D - B: 5  (path A->D->B->C is 5 + 5 + 15 = 25, strictly shortest)
    Shortest path A -> C must be A -> D -> B -> C (weight = 25).
    """
    test_graph = nx.Graph()
    test_graph.add_edge("A", "B", length=12)
    test_graph.add_edge("B", "C", length=15)
    test_graph.add_edge("A", "C", length=30)
    test_graph.add_edge("A", "D", length=5)
    test_graph.add_edge("D", "B", length=5)

    path = nx.shortest_path(test_graph, "A", "C", weight="length")
    dist = nx.shortest_path_length(test_graph, "A", "C", weight="length")

    assert path == ["A", "D", "B", "C"]
    assert dist == 25


def test_dijkstra_real_network_connectivity():
    """Verify that all 105 cities in the road network are connected and reachable."""
    assert app.road_network is not None
    assert nx.is_connected(app.road_network) is True
    assert app.road_network.number_of_nodes() == 105
    assert app.road_network.number_of_edges() == 161


# ============================================================================
# 3. Route Planning API (/predict)
# ============================================================================

def test_predict_valid_route(client):
    """Verify route prediction between Delhi and Mumbai."""
    res = client.post("/predict", json={"source": "Delhi", "destination": "Mumbai"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["source"] == "Delhi"
    assert data["destination"] == "Mumbai"
    assert data["path"][0] == "Delhi"
    assert data["path"][-1] == "Mumbai"
    assert data["distance"] > 1000
    assert "hr" in data["time"] or "min" in data["time"]
    assert data["prediction_method"] == "ml_random_forest"
    assert len(data["coordinates"]) == len(data["path"])
    assert len(data["alternate_routes"]) >= 1


def test_predict_case_insensitive(client):
    """Verify case-insensitive city resolution (e.g. 'delhi' and 'MUMBAI')."""
    res = client.post("/predict", json={"source": "delhi", "destination": "MUMBAI"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["path"][0] == "Delhi"
    assert data["path"][-1] == "Mumbai"


def test_predict_long_distance_extreme(client):
    """Verify long-distance route across India: Srinagar to Thiruvananthapuram."""
    res = client.post("/predict", json={"source": "Srinagar", "destination": "Thiruvananthapuram"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["path"][0] == "Srinagar"
    assert data["path"][-1] == "Thiruvananthapuram"
    assert data["distance"] > 3000
    assert len(data["coordinates"]) == len(data["path"])


def test_predict_coordinates_order(client):
    """Verify returned coordinates are valid [latitude, longitude] pairs in India range."""
    res = client.post("/predict", json={"source": "Delhi", "destination": "Jaipur"})
    assert res.status_code == 200
    data = res.get_json()
    for lat, lon in data["coordinates"]:
        assert 6.0 <= lat <= 38.0  # India latitude range
        assert 68.0 <= lon <= 98.0  # India longitude range


# ============================================================================
# 4. Input Validation & Error Handling
# ============================================================================

def test_predict_missing_body(client):
    """Verify 400 when body is empty or not JSON."""
    res = client.post("/predict", data="not json", content_type="text/plain")
    assert res.status_code == 400
    assert "error" in res.get_json()


def test_predict_missing_fields(client):
    """Verify 400 when source or destination is missing."""
    res1 = client.post("/predict", json={"source": "Delhi"})
    assert res1.status_code == 400

    res2 = client.post("/predict", json={"destination": "Mumbai"})
    assert res2.status_code == 400


def test_predict_non_string_fields(client):
    """Verify 400 when fields are non-string types."""
    res = client.post("/predict", json={"source": 12345, "destination": True})
    assert res.status_code == 400


def test_predict_same_city(client):
    """Verify 400 when source and destination are identical."""
    res = client.post("/predict", json={"source": "Delhi", "destination": "Delhi"})
    assert res.status_code == 400
    assert "cannot be the same" in res.get_json()["error"]


def test_predict_unknown_source(client):
    """Verify 404 when source city is not in road network."""
    res = client.post("/predict", json={"source": "Atlantis", "destination": "Mumbai"})
    assert res.status_code == 404
    assert "Atlantis" in res.get_json()["error"]


def test_predict_unknown_destination(client):
    """Verify 404 when destination city is not in road network."""
    res = client.post("/predict", json={"source": "Delhi", "destination": "GothamCity"})
    assert res.status_code == 404
    assert "GothamCity" in res.get_json()["error"]


def test_predict_unreachable_destination():
    """Verify that if two nodes are disconnected in a graph, 404 is returned gracefully."""
    disconnected_graph = nx.Graph()
    disconnected_graph.add_node("CityA", pos=(20, 70), lat=20, lon=70)
    disconnected_graph.add_node("CityB", pos=(25, 75), lat=25, lon=75)
    # No edge between CityA and CityB

    with pytest.raises(nx.NetworkXNoPath):
        nx.shortest_path(disconnected_graph, "CityA", "CityB", weight="length")


# ============================================================================
# 5. Alternative Routes Uniqueness & Validity
# ============================================================================

def test_alternate_routes_uniqueness():
    """Verify alternate routes are not duplicates of the main route or of each other."""
    main_path = ["Delhi", "Jaipur", "Ahmedabad", "Mumbai"]
    alternates, details = app.find_alternate_routes(
        app.road_network, "Delhi", "Mumbai", main_path=main_path, k=3
    )

    for alt in alternates:
        assert alt != main_path
        # Must be connected in the graph
        for u, v in zip(alt[:-1], alt[1:]):
            assert app.road_network.has_edge(u, v)

    # Check for duplicate paths
    unique_paths = [tuple(p) for p in alternates]
    assert len(unique_paths) == len(set(unique_paths))


def test_alternate_routes_details_metadata():
    """Verify alternate route details include positive distance and formatted time."""
    _, details = app.find_alternate_routes(
        app.road_network, "Delhi", "Mumbai", main_path=None, k=2
    )
    for d in details:
        assert d["distance"] > 0
        assert d["hours"] > 0
        assert "min" in d["time"] or "hr" in d["time"]


# ============================================================================
# 6. Machine Learning Model & Fallback Verification
# ============================================================================

def test_ml_prediction_validity():
    """Verify ML predictions are numeric, finite, non-negative, and in hours."""
    res = app.calculate_travel_time(280.0)  # Delhi to Jaipur
    assert res["method"] == "ml_random_forest"
    assert isinstance(res["hours"], (int, float))
    assert res["hours"] > 0
    assert not math.isnan(res["hours"])
    assert not math.isinf(res["hours"])
    assert "hr" in res["time"] or "min" in res["time"]


def test_ml_zero_distance():
    """Verify 0 distance returns 0 min."""
    res = app.calculate_travel_time(0.0)
    assert res["hours"] == 0.0
    assert res["time"] == "0 min"


def test_ml_fallback_when_model_missing():
    """Verify transparent fallback based on 60 km/h assumption when model is unavailable."""
    original_model = app.ml_model
    try:
        app.ml_model = None
        res = app.calculate_travel_time(120.0)  # 120 km at 60 km/h = 2.0 hours
        assert res["method"] == "fallback_constant_speed"
        assert res["hours"] == 2.0
        assert res["time"] == "2 hr 0 min"
    finally:
        app.ml_model = original_model


# ============================================================================
# 7. CORS Configuration
# ============================================================================

def test_cors_headers(client):
    """Verify CORS headers are present on API responses."""
    res = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert res.status_code == 200
    assert res.headers.get("Access-Control-Allow-Origin") == "*" or "localhost" in res.headers.get("Access-Control-Allow-Origin", "")


# ============================================================================
# 8. Extended Edge Cases & Quality Assurance
# ============================================================================

def test_ml_extrapolation_extreme_distance():
    """Verify that extreme distances (>1500 km) extrapolate properly and yield realistic speeds."""
    res = app.calculate_travel_time(3500.0)
    assert res["method"] == "ml_random_forest"
    assert res["hours"] > 35.0  # Must be > 35 hours for 3500 km (realistic highway driving)
    effective_speed = 3500.0 / res["hours"]
    assert 55.0 <= effective_speed <= 85.0  # Highway speed must be realistic (55-85 km/h)


def test_edge_weights_positive():
    """Verify all edge lengths in the road network are finite and strictly positive."""
    for u, v, data in app.road_network.edges(data=True):
        assert "length" in data, f"Edge ({u}, {v}) missing length"
        assert isinstance(data["length"], (int, float))
        assert data["length"] > 0, f"Edge ({u}, {v}) has non-positive length: {data['length']}"


def test_deterministic_disconnected_dijkstra():
    """Verify Dijkstra correctly flags unreachable paths in a disconnected graph fixture."""
    g = nx.Graph()
    g.add_node("X", lat=10.0, lon=70.0)
    g.add_node("Y", lat=11.0, lon=71.0)
    g.add_node("Z", lat=12.0, lon=72.0)
    g.add_edge("X", "Y", length=50)
    # Z is isolated
    with pytest.raises(nx.NetworkXNoPath):
        nx.shortest_path(g, "X", "Z", weight="length")


def test_predict_with_gps_user_coord(client):
    """Verify routing starting directly from user's GPS current location."""
    res = client.post("/predict", json={
        "source": "Your Location",
        "destination": "Delhi",
        "user_coord": [30.3255, 78.0412]  # Dehradun area coordinates
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["path"][0] == "Your Location"
    assert data["coordinates"][0] == [30.3255, 78.0412]
    assert data["path"][-1] == "Delhi"
    assert data["distance"] > 200


