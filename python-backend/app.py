from flask import Flask, request, jsonify
from flask_cors import CORS
import networkx as nx
import pickle
import os
from typing import List, Tuple, Dict, Any, Optional
import math
import json
import urllib.request
import urllib.error
import joblib
import numpy as np
import pandas as pd

# Base directories for robust path resolution regardless of CWD
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
CACHE_FILE = os.path.join(BASE_DIR, "road_network.pkl")

# Public OSRM routing service — gives real road distance/duration/geometry
# (close to Google Maps). Override with the OSRM_URL env var if self-hosting.
OSRM_BASE = os.getenv("OSRM_URL", "https://router.project-osrm.org").rstrip("/")

# Feature columns the ML model was trained on (must match the order used in training)
ML_FEATURE_NAMES = ["distance_km", "road_type", "traffic_level", "time_of_day"]

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

# Global variables
road_network: Optional[nx.Graph] = None
city_locations = {}
ml_model = None  # ML model for travel time prediction

# Initialize city coordinates with REAL data (ALL 105 major Indian cities)
CITY_COORDS: Dict[str, Tuple[float, float]] = {
    # Tier-1 Metro Cities (Population > 10M)
    "Delhi": (28.6139, 77.2090),
    "Mumbai": (19.0760, 72.8777),
    "Bangalore": (12.9716, 77.5946),
    "Kolkata": (22.5726, 88.3639),
    "Chennai": (13.0827, 80.2707),
    "Hyderabad": (17.3850, 78.4867),

    # Tier-2 Major Cities (Population > 2M)
    "Pune": (18.5204, 73.8567),
    "Ahmedabad": (23.0225, 72.5714),
    "Jaipur": (26.9124, 75.7873),
    "Surat": (21.1702, 72.8311),
    "Lucknow": (26.8467, 80.9462),
    "Kanpur": (26.4499, 80.3319),
    "Nagpur": (21.1458, 79.0882),
    "Indore": (22.7196, 75.8577),
    "Bhopal": (23.2599, 77.4126),
    "Visakhapatnam": (17.6868, 83.2185),
    "Patna": (25.5941, 85.1376),
    "Vadodara": (22.3072, 73.1812),
    "Ludhiana": (30.9010, 75.8573),
    "Agra": (27.1767, 78.0081),
    "Nashik": (19.9975, 73.7898),
    "Rajkot": (22.3039, 70.8022),
    "Varanasi": (25.3176, 82.9739),
    "Meerut": (28.9845, 77.7064),
    "Faridabad": (28.4089, 77.3178),
    "Ghaziabad": (28.6692, 77.4538),

    # Tier-3 Important Cities (State Capitals & Major Centers)
    "Amritsar": (31.6340, 74.8723),
    "Allahabad": (25.4358, 81.8463),
    "Ranchi": (23.3441, 85.3096),
    "Howrah": (22.5958, 88.2636),
    "Coimbatore": (11.0168, 76.9558),
    "Jabalpur": (23.1815, 79.9864),
    "Gwalior": (26.2183, 78.1828),
    "Vijayawada": (16.5062, 80.6480),
    "Madurai": (9.9252, 78.1198),
    "Mysore": (12.2958, 76.6394),
    "Goa": (15.2993, 74.1240),
    "Chandigarh": (30.7333, 76.7794),
    "Thiruvananthapuram": (8.5241, 76.9366),
    "Kochi": (9.9312, 76.2673),
    "Guwahati": (26.1445, 91.7362),
    "Bhubaneswar": (20.2961, 85.8245),
    "Dehradun": (30.3165, 78.0322),
    "Raipur": (21.2514, 81.6296),
    "Jodhpur": (26.2389, 73.0243),
    "Kota": (25.2138, 75.8648),
    "Udaipur": (24.5854, 73.7125),

    # North India Cities
    "Shimla": (31.1048, 77.1734),
    "Jammu": (32.7266, 74.8570),
    "Srinagar": (34.0837, 74.7973),
    "Haridwar": (29.9457, 78.1642),
    "Rishikesh": (30.0869, 78.2676),
    "Muzaffarpur": (26.1225, 85.3906),
    "Aligarh": (27.8974, 78.0880),
    "Moradabad": (28.8389, 78.7378),
    "Saharanpur": (29.9680, 77.5460),
    "Gorakhpur": (26.7606, 83.3732),
    "Bareilly": (28.3640, 79.4150),
    "Jhansi": (25.4484, 78.5685),

    # South India Cities
    "Tiruchirappalli": (10.7905, 78.7047),
    "Salem": (11.6643, 78.1460),
    "Tirupati": (13.6288, 79.4192),
    "Vellore": (12.9165, 79.1325),
    "Warangal": (17.9689, 79.5941),
    "Guntur": (16.3067, 80.4365),
    "Nellore": (14.4426, 79.9865),
    "Kakinada": (16.9891, 82.2475),
    "Rajahmundry": (17.0005, 81.8040),
    "Tirunelveli": (8.7139, 77.7567),
    "Erode": (11.3410, 77.7172),
    "Thanjavur": (10.7870, 79.1378),
    "Mangalore": (12.9141, 74.8560),
    "Hubli": (15.3647, 75.1240),
    "Belgaum": (15.8497, 74.4977),
    "Gulbarga": (17.3297, 76.8343),

    # West India Cities
    "Aurangabad": (19.8762, 75.3433),
    "Kolhapur": (16.7050, 74.2433),
    "Solapur": (17.6599, 75.9064),
    "Jalgaon": (21.0077, 75.5626),
    "Bhavnagar": (21.7645, 72.1519),
    "Jamnagar": (22.4707, 70.0577),
    "Gandhinagar": (23.2156, 72.6369),
    "Anand": (22.5645, 72.9289),

    # East India Cities
    "Siliguri": (26.7271, 88.3953),
    "Durgapur": (23.5204, 87.3119),
    "Asansol": (23.6739, 86.9524),
    "Cuttack": (20.5124, 85.8829),
    "Rourkela": (22.2604, 84.8536),
    "Jamshedpur": (22.8046, 86.2029),
    "Dhanbad": (23.7957, 86.4304),
    "Bokaro": (23.6693, 86.1511),

    # Central India Cities
    "Ujjain": (23.1765, 75.7885),
    "Sagar": (23.8388, 78.7378),
    "Ratlam": (23.3315, 75.0367),
    "Satna": (24.6005, 80.8322),
    "Bilaspur": (22.0797, 82.1409),
    "Korba": (22.3595, 82.7501),

    # Northeast India Cities
    "Shillong": (25.5788, 91.8933),
    "Imphal": (24.8170, 93.9368),
    "Agartala": (23.8315, 91.2868),
    "Aizawl": (23.7271, 92.7176),
    "Kohima": (25.6701, 94.1077),
    "Itanagar": (27.1022, 93.6919),
    "Dibrugarh": (27.4728, 94.9120),
    "Silchar": (24.8333, 92.7789),
}

# Case-insensitive lookup map for robust user input
CITY_LOOKUP: Dict[str, str] = {k.lower(): k for k in CITY_COORDS.keys()}


def create_simplified_graph() -> nx.Graph:
    """Create a fully connected road network with REAL distances for 105 major Indian cities.
    Distances are in kilometers along actual National Highways.
    """
    G = nx.Graph()

    # Add nodes (cities) with coordinates
    for city, coords in CITY_COORDS.items():
        G.add_node(city, pos=coords, lat=coords[0], lon=coords[1])

    # Add edges with REAL road distances (in km) from actual highway routes
    connections = [
        # === GOLDEN QUADRILATERAL (Main Arteries) ===
        ("Delhi", "Jaipur", 280),
        ("Jaipur", "Ahmedabad", 660),
        ("Ahmedabad", "Mumbai", 526),
        ("Mumbai", "Pune", 148),
        ("Pune", "Hyderabad", 559),
        ("Hyderabad", "Vijayawada", 275),
        ("Vijayawada", "Chennai", 432),
        ("Chennai", "Bangalore", 346),
        ("Bangalore", "Hyderabad", 569),
        ("Delhi", "Agra", 233),
        ("Agra", "Kanpur", 294),
        ("Kanpur", "Lucknow", 83),
        ("Lucknow", "Varanasi", 320),
        ("Varanasi", "Patna", 247),
        ("Patna", "Kolkata", 585),

        # === DELHI NCR & NORTH ===
        ("Delhi", "Ghaziabad", 19),
        ("Delhi", "Faridabad", 28),
        ("Delhi", "Meerut", 72),
        ("Delhi", "Gwalior", 319),
        ("Delhi", "Chandigarh", 243),
        ("Delhi", "Amritsar", 453),
        ("Delhi", "Ludhiana", 313),
        ("Delhi", "Dehradun", 248),
        ("Delhi", "Haridwar", 214),
        ("Chandigarh", "Amritsar", 229),
        ("Chandigarh", "Ludhiana", 98),
        ("Chandigarh", "Shimla", 113),
        ("Amritsar", "Ludhiana", 142),
        ("Amritsar", "Jammu", 210),
        ("Jammu", "Srinagar", 261),
        ("Haridwar", "Rishikesh", 20),
        ("Haridwar", "Dehradun", 52),
        ("Meerut", "Saharanpur", 68),
        ("Meerut", "Moradabad", 87),
        ("Ghaziabad", "Meerut", 60),
        ("Agra", "Gwalior", 119),
        ("Agra", "Jaipur", 239),
        ("Agra", "Jhansi", 231),
        ("Gwalior", "Jhansi", 103),

        # === UTTAR PRADESH ===
        ("Lucknow", "Kanpur", 83),
        ("Lucknow", "Allahabad", 200),
        ("Lucknow", "Gorakhpur", 273),
        ("Lucknow", "Bareilly", 252),
        ("Kanpur", "Allahabad", 194),
        ("Varanasi", "Allahabad", 125),
        ("Varanasi", "Gorakhpur", 231),
        ("Gorakhpur", "Patna", 277),
        ("Aligarh", "Agra", 90),
        ("Bareilly", "Moradabad", 84),

        # === RAJASTHAN ===
        ("Jaipur", "Jodhpur", 337),
        ("Jaipur", "Kota", 241),
        ("Jaipur", "Udaipur", 394),
        ("Jodhpur", "Udaipur", 254),
        ("Kota", "Indore", 294),
        ("Udaipur", "Ahmedabad", 254),

        # === GUJARAT ===
        ("Ahmedabad", "Surat", 263),
        ("Ahmedabad", "Vadodara", 110),
        ("Ahmedabad", "Rajkot", 217),
        ("Ahmedabad", "Gandhinagar", 23),
        ("Ahmedabad", "Indore", 423),
        ("Surat", "Vadodara", 151),
        ("Surat", "Mumbai", 281),
        ("Rajkot", "Jamnagar", 89),
        ("Rajkot", "Bhavnagar", 178),
        ("Vadodara", "Anand", 43),

        # === MAHARASHTRA ===
        ("Mumbai", "Pune", 148),
        ("Mumbai", "Nashik", 167),
        ("Mumbai", "Surat", 281),
        ("Mumbai", "Goa", 464),
        ("Pune", "Nashik", 209),
        ("Pune", "Solapur", 250),
        ("Pune", "Kolhapur", 237),
        ("Pune", "Aurangabad", 233),
        ("Pune", "Goa", 450),
        ("Nashik", "Aurangabad", 183),
        ("Nashik", "Indore", 515),
        ("Nashik", "Jalgaon", 180),
        ("Aurangabad", "Jalgaon", 152),
        ("Aurangabad", "Nagpur", 442),
        ("Nagpur", "Hyderabad", 502),
        ("Nagpur", "Indore", 330),
        ("Nagpur", "Bhopal", 353),
        ("Nagpur", "Raipur", 290),
        ("Nagpur", "Jabalpur", 270),
        ("Solapur", "Hyderabad", 309),
        ("Kolhapur", "Goa", 228),

        # === MADHYA PRADESH ===
        ("Indore", "Bhopal", 196),
        ("Indore", "Ujjain", 55),
        ("Bhopal", "Jabalpur", 332),
        ("Bhopal", "Gwalior", 423),
        ("Bhopal", "Nagpur", 353),
        ("Bhopal", "Sagar", 172),
        ("Jabalpur", "Sagar", 168),
        ("Jabalpur", "Raipur", 341),
        ("Jabalpur", "Varanasi", 535),
        ("Ujjain", "Ratlam", 94),
        ("Satna", "Allahabad", 128),
        ("Satna", "Jabalpur", 200),

        # === CHHATTISGARH ===
        ("Raipur", "Nagpur", 290),
        ("Raipur", "Bilaspur", 118),
        ("Raipur", "Bhubaneswar", 447),
        ("Bilaspur", "Korba", 91),

        # === TELANGANA & ANDHRA PRADESH ===
        ("Hyderabad", "Bangalore", 569),
        ("Hyderabad", "Chennai", 626),
        ("Hyderabad", "Pune", 559),
        ("Hyderabad", "Nagpur", 502),
        ("Hyderabad", "Vijayawada", 275),
        ("Hyderabad", "Visakhapatnam", 619),
        ("Hyderabad", "Warangal", 148),
        ("Vijayawada", "Visakhapatnam", 351),
        ("Vijayawada", "Guntur", 33),
        ("Vijayawada", "Tirupati", 274),
        ("Vijayawada", "Rajahmundry", 188),
        ("Visakhapatnam", "Rajahmundry", 193),
        ("Visakhapatnam", "Kakinada", 158),
        ("Guntur", "Nellore", 176),

        # === KARNATAKA ===
        ("Bangalore", "Chennai", 346),
        ("Bangalore", "Hyderabad", 569),
        ("Bangalore", "Mysore", 144),
        ("Bangalore", "Coimbatore", 362),
        ("Bangalore", "Mangalore", 352),
        ("Bangalore", "Hubli", 410),
        ("Mysore", "Coimbatore", 267),
        ("Mangalore", "Goa", 360),
        ("Hubli", "Belgaum", 102),
        ("Hubli", "Goa", 195),
        ("Belgaum", "Goa", 138),
        ("Gulbarga", "Hyderabad", 220),

        # === TAMIL NADU ===
        ("Chennai", "Bangalore", 346),
        ("Chennai", "Coimbatore", 507),
        ("Chennai", "Madurai", 462),
        ("Chennai", "Tiruchirappalli", 322),
        ("Chennai", "Vellore", 138),
        ("Chennai", "Tirupati", 138),
        ("Coimbatore", "Madurai", 215),
        ("Coimbatore", "Mysore", 267),
        ("Coimbatore", "Kochi", 193),
        ("Coimbatore", "Erode", 88),
        ("Madurai", "Tirunelveli", 151),
        ("Tiruchirappalli", "Madurai", 134),
        ("Tiruchirappalli", "Thanjavur", 59),
        ("Salem", "Coimbatore", 162),
        ("Salem", "Bangalore", 183),

        # === KERALA ===
        ("Kochi", "Thiruvananthapuram", 220),
        ("Kochi", "Coimbatore", 193),
        ("Thiruvananthapuram", "Madurai", 268),

        # === WEST BENGAL ===
        ("Kolkata", "Howrah", 5),
        ("Kolkata", "Patna", 585),
        ("Kolkata", "Ranchi", 424),
        ("Kolkata", "Bhubaneswar", 442),
        ("Kolkata", "Siliguri", 580),
        ("Kolkata", "Durgapur", 169),
        ("Kolkata", "Asansol", 213),
        ("Siliguri", "Guwahati", 407),
        ("Durgapur", "Asansol", 48),

        # === BIHAR & JHARKHAND ===
        ("Patna", "Kolkata", 585),
        ("Patna", "Varanasi", 247),
        ("Patna", "Ranchi", 333),
        ("Patna", "Muzaffarpur", 70),
        ("Ranchi", "Jamshedpur", 130),
        ("Ranchi", "Dhanbad", 164),
        ("Ranchi", "Bokaro", 107),
        ("Jamshedpur", "Kolkata", 266),
        ("Dhanbad", "Asansol", 114),

        # === ODISHA ===
        ("Bhubaneswar", "Kolkata", 442),
        ("Bhubaneswar", "Cuttack", 28),
        ("Bhubaneswar", "Visakhapatnam", 444),
        ("Bhubaneswar", "Rourkela", 344),
        ("Cuttack", "Rourkela", 318),

        # === NORTHEAST ===
        ("Guwahati", "Siliguri", 407),
        ("Guwahati", "Shillong", 103),
        ("Guwahati", "Dibrugarh", 436),
        ("Guwahati", "Imphal", 483),
        ("Guwahati", "Agartala", 599),
        ("Guwahati", "Itanagar", 330),
        ("Dibrugarh", "Itanagar", 145),
        ("Shillong", "Silchar", 314),
        ("Silchar", "Aizawl", 140),
        ("Imphal", "Kohima", 146),
        ("Agartala", "Silchar", 184),
    ]

    for city1, city2, distance in connections:
        if city1 in G.nodes and city2 in G.nodes:
            G.add_edge(city1, city2, length=distance)

    return G


def load_graph():
    """Load or create road network graph with robust caching."""
    global road_network

    need_recreate = True
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "rb") as f:
                cached = pickle.load(f)
            # Verify cached graph is valid and fully connected
            if cached is not None and getattr(cached, "number_of_nodes", lambda: 0)() == len(CITY_COORDS):
                if nx.is_connected(cached):
                    road_network = cached
                    need_recreate = False
                    print(f"Loading cached road network ({road_network.number_of_nodes()} nodes, {road_network.number_of_edges()} edges)...")
        except Exception as e:
            print(f"Error reading cached road network: {e}")

    if need_recreate:
        print("Creating complete, connected road network graph...")
        road_network = create_simplified_graph()
        try:
            with open(CACHE_FILE, "wb") as f:
                pickle.dump(road_network, f)
            print(f"Saved road network to {CACHE_FILE}")
        except Exception as e:
            print(f"Warning: Could not save road network cache: {e}")

    print(f"Graph ready: {road_network.number_of_nodes()} nodes, {road_network.number_of_edges()} edges (connected: {nx.is_connected(road_network)})")


def load_ml_model():
    """Load the trained ML model for travel time prediction."""
    global ml_model

    candidates = [
        os.getenv("MODEL_PATH"),
        os.path.join(PROJECT_ROOT, "travel_time_model.pkl"),
        os.path.join(BASE_DIR, "travel_time_model.pkl"),
        os.path.join(PROJECT_ROOT, "python-backend", "travel_time_model.pkl"),
    ]

    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            try:
                print(f"Loading ML model from {candidate}...")
                ml_model = joblib.load(candidate)
                print("ML model loaded successfully!")
                return
            except Exception as e:
                print(f"Failed to load model from {candidate}: {e}")

    print("Warning: ML model not found. Using speed-based fallback calculation.")
    ml_model = None


def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculate great-circle distance between two coordinates in kilometers."""
    R = 6371.0
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(max(0.0, min(1.0, a))))
    return R * c


def format_hours(hours: float) -> str:
    """Format duration in hours to '<h> hr <m> min' or '<m> min'."""
    if hours <= 0:
        return "0 min"
    total_minutes = int(round(hours * 60.0))
    h, m = divmod(total_minutes, 60)
    if h <= 0:
        return f"{m} min"
    return f"{h} hr {m} min"


def calculate_travel_time(
    distance_km: float,
    road_type: int = 2,
    traffic_level: float = 0.7,
    time_of_day: int = 1,
) -> Dict[str, Any]:
    """Calculate estimated travel time using the Random Forest ML model with transparent fallback.

    Default parameters represent Indian National Highway / Expressway driving conditions:
      - road_type: 2 (National Highway / Expressway)
      - traffic_level: 0.7 (standard highway flow; ~75-85 km/h cruise speed)
      - time_of_day: 1 (daytime travel)

    Returns:
        dict with:
            - 'time': formatted string (e.g., '3 hr 55 min')
            - 'hours': non-negative finite float hours
            - 'method': 'ml_random_forest' | 'fallback_constant_speed' | 'zero_distance'
    """
    global ml_model

    if distance_km <= 0:
        return {"time": "0 min", "hours": 0.0, "method": "zero_distance"}

    hours: Optional[float] = None
    method = "fallback_constant_speed"

    if ml_model is not None:
        try:
            features = pd.DataFrame(
                [[distance_km, road_type, traffic_level, time_of_day]],
                columns=ML_FEATURE_NAMES,
            )
            pred = float(ml_model.predict(features)[0])
            if not (math.isnan(pred) or math.isinf(pred) or pred <= 0):
                hours = pred
                method = "ml_random_forest"
        except Exception as e:
            print(f"ML prediction error: {e}; falling back to constant speed")

    if hours is None:
        # Fallback based on documented 60 km/h average highway driving speed
        hours = distance_km / 60.0
        method = "fallback_constant_speed"

    return {
        "time": format_hours(hours),
        "hours": round(hours, 2),
        "method": method,
    }


def calculate_time(distance_km: float) -> str:
    """Backward-compatible helper returning the formatted travel time string."""
    return calculate_travel_time(distance_km)["time"]


def format_duration(seconds: float) -> str:
    """Format a duration in seconds as '<h> hr <m> min' (or '<m> min')."""
    total_minutes = int(round(seconds / 60.0))
    hours, minutes = divmod(total_minutes, 60)
    if hours <= 0:
        return f"{minutes} min"
    return f"{hours} hr {minutes} min"


def format_maneuver_instruction(m_type: str, modifier: str, name: str) -> str:
    """Produce a human-readable driving instruction from OSRM maneuver data."""
    name_str = f" on {name}" if name and name.strip() else ""
    mod_str = f" {modifier}" if modifier and modifier not in ["straight", "none"] else ""

    if m_type == "depart":
        return f"Depart{name_str}"
    if m_type == "arrive":
        return "Arrive at destination"
    if m_type in ["turn", "fork", "end of road"]:
        return f"Turn{mod_str}{name_str}"
    if m_type == "merge":
        return f"Merge{mod_str}{name_str}"
    if m_type in ["on ramp", "off ramp"]:
        return f"Take ramp{mod_str}{name_str}"
    if m_type == "roundabout":
        return f"Enter roundabout and take exit{name_str}"
    if m_type == "new name":
        return f"Continue{name_str}"
    return f"Continue{mod_str}{name_str}"


_OSRM_CACHE: Dict[str, Dict[str, Any]] = {}


def get_osrm_route(coordinates: List[List[float]]) -> Optional[Dict[str, Any]]:
    """Query OSRM for real road distance, duration, turn-by-turn steps, and geometry.

    Args:
        coordinates: ordered waypoints as [lat, lon] pairs.

    Returns:
        {"distance_km", "duration_s", "geometry": [[lat, lon], ...], "steps": [...]} on success,
        or None if the routing service is unavailable / returns no route.
    """
    if not coordinates or len(coordinates) < 2:
        return None

    # Check in-memory cache
    cache_key = ";".join(f"{round(lat, 4)},{round(lon, 4)}" for lat, lon in coordinates)
    if cache_key in _OSRM_CACHE:
        return _OSRM_CACHE[cache_key]

    try:
        # OSRM expects "lon,lat" pairs separated by ";"
        waypoints = ";".join(f"{lon},{lat}" for lat, lon in coordinates)
        url = (
            f"{OSRM_BASE}/route/v1/driving/{waypoints}"
            "?overview=full&geometries=geojson&steps=true"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "ai-navigation/1.0"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        if data.get("code") == "Ok" and data.get("routes"):
            route = data["routes"][0]
            # GeoJSON is [lon, lat]; convert to [lat, lon] for Leaflet
            geometry = [[lat, lon] for lon, lat in route["geometry"]["coordinates"]]

            steps: List[Dict[str, Any]] = []
            for leg in route.get("legs", []):
                for s in leg.get("steps", []):
                    dist_km = round(s.get("distance", 0) / 1000.0, 2)
                    m = s.get("maneuver", {})
                    m_type = m.get("type", "continue")
                    modifier = m.get("modifier", "")
                    name = s.get("name", "")
                    if dist_km < 0.1 and m_type not in ["depart", "arrive"]:
                        continue
                    instruction = format_maneuver_instruction(m_type, modifier, name)
                    steps.append({
                        "instruction": instruction,
                        "distance_km": dist_km,
                        "duration": format_duration(s.get("duration", 0)),
                        "type": m_type,
                        "modifier": modifier,
                    })

            result = {
                "distance_km": route["distance"] / 1000.0,
                "duration_s": route["duration"],
                "geometry": geometry,
                "steps": steps,
            }
            _OSRM_CACHE[cache_key] = result
            return result
    except (urllib.error.URLError, urllib.error.HTTPError, ValueError, KeyError, TimeoutError) as e:
        print(f"OSRM lookup notice ({e}); using graph and ML estimates")

    return None


def get_path_coordinates(G: nx.Graph, path: List[str]) -> List[List[float]]:
    """Assemble [lat, lon] coordinates for all cities in a path."""
    coords: List[List[float]] = []
    for city in path:
        if city in G.nodes:
            node_data = G.nodes[city]
            if 'lat' in node_data and 'lon' in node_data:
                coords.append([node_data['lat'], node_data['lon']])
                continue
            if 'pos' in node_data:
                coords.append([node_data['pos'][0], node_data['pos'][1]])
                continue
        if city in CITY_COORDS:
            coords.append([CITY_COORDS[city][0], CITY_COORDS[city][1]])
    return coords


def find_alternate_routes(
    G: nx.Graph,
    source: str,
    target: str,
    main_path: Optional[List[str]] = None,
    k: int = 2,
) -> Tuple[List[List[str]], List[Dict[str, Any]]]:
    """Find up to k alternate routes that are genuinely different from the primary route.

    Returns:
        tuple (alternates_list, alternates_detail_list)
        where each detail contains path, distance, formatted time, hours, method,
        waypoint coordinates, and road polyline geometry.
    """
    try:
        alternates: List[List[str]] = []
        details: List[Dict[str, Any]] = []

        for path in nx.shortest_simple_paths(G, source, target, weight='length'):
            if main_path is not None and path == main_path:
                continue
            if path in alternates:
                continue

            dist = float(nx.path_weight(G, path, weight='length'))
            time_info = calculate_travel_time(dist)
            alt_coords = get_path_coordinates(G, path)
            osrm = get_osrm_route(alt_coords)
            if osrm:
                alt_dist = round(float(osrm["distance_km"]), 2)
                alt_geometry = osrm["geometry"]
                alt_osrm_time = format_duration(osrm["duration_s"])
                alt_time = format_duration(osrm["duration_s"] * 1.10)
                alt_hours = round((osrm["duration_s"] * 1.10) / 3600.0, 2)
                alt_method = "real_road_network"
            else:
                alt_dist = round(dist, 2)
                alt_geometry = alt_coords
                alt_osrm_time = None
                time_info = calculate_travel_time(alt_dist)
                alt_time = time_info["time"]
                alt_hours = time_info["hours"]
                alt_method = time_info["method"]

            alternates.append(path)
            details.append({
                "path": path,
                "distance": alt_dist,
                "time": alt_time,
                "hours": alt_hours,
                "method": alt_method,
                "osrm_time": alt_osrm_time,
                "coordinates": alt_coords,
                "geometry": alt_geometry,
            })

            if len(alternates) >= k:
                break

        return alternates, details
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return [], []


@app.route('/predict', methods=['POST'])
def predict_route():
    """Main endpoint for route prediction using Dijkstra pathfinding and Random Forest ML travel time."""
    try:
        data = request.get_json(silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({"error": "Invalid request: JSON body with 'source' and 'destination' is required"}), 400

        source_raw = data.get('source')
        destination_raw = data.get('destination')

        if not isinstance(source_raw, str) or not isinstance(destination_raw, str):
            return jsonify({"error": "Source and destination must be non-empty strings"}), 400

        source_in = source_raw.strip()
        destination_in = destination_raw.strip()

        if not source_in or not destination_in:
            return jsonify({"error": "Source and destination are required"}), 400

        if road_network is None:
            return jsonify({"error": "Road network not initialized"}), 503

        # Case-insensitive lookup matching canonical city names
        source = CITY_LOOKUP.get(source_in.lower(), source_in)
        destination = CITY_LOOKUP.get(destination_in.lower(), destination_in)

        # Check if cities exist in network
        if source not in road_network.nodes:
            return jsonify({"error": f"Source city '{source_in}' not found in network"}), 404

        if destination not in road_network.nodes:
            return jsonify({"error": f"Destination city '{destination_in}' not found in network"}), 404

        if source == destination:
            return jsonify({"error": "Source and destination cannot be the same"}), 400

        # Find shortest path using Dijkstra's algorithm on real highway graph
        try:
            path = nx.shortest_path(road_network, source, destination, weight='length')
            distance_km = float(nx.shortest_path_length(road_network, source, destination, weight='length'))
        except nx.NetworkXNoPath:
            return jsonify({"error": f"No route found between {source} and {destination}"}), 404

        # Assemble waypoint coordinates [lat, lon]
        coordinates = get_path_coordinates(road_network, path)
        geometry = coordinates
        osrm_time = None

        # Check OSRM for real road polyline geometry and exact road distance/duration
        osrm = get_osrm_route(coordinates)
        if osrm:
            geometry = osrm["geometry"]
            distance_km = round(float(osrm["distance_km"]), 2)
            osrm_time = format_duration(osrm["duration_s"])
            # Match Google Maps real-world road duration with 10% toll plaza and traffic buffer
            time_str = format_duration(osrm["duration_s"] * 1.10)
            prediction_method = "real_road_network"
        else:
            # Fallback to calibrated highway ML model
            ml_prediction = calculate_travel_time(distance_km)
            time_str = ml_prediction["time"]
            prediction_method = ml_prediction["method"]

        # Compute ML travel time prediction from Random Forest model
        ml_prediction = calculate_travel_time(distance_km)

        # Find genuinely distinct alternative routes
        alternate_routes, alternate_details = find_alternate_routes(
            road_network, source, destination, main_path=path, k=2
        )

        # Assemble turn-by-turn steps
        steps = []
        if osrm and "steps" in osrm and osrm["steps"]:
            steps = osrm["steps"]
        else:
            for i, city in enumerate(path):
                if i == 0:
                    steps.append({"instruction": f"Depart from {city}", "distance_km": 0.0, "type": "depart"})
                elif i == len(path) - 1:
                    steps.append({"instruction": f"Arrive at destination in {city}", "distance_km": round(distance_km, 2), "type": "arrive"})
                else:
                    steps.append({"instruction": f"Continue through {city}", "distance_km": 0.0, "type": "continue"})

        response = {
            "path": path,
            "distance": round(distance_km, 2),
            "time": time_str,
            "coordinates": coordinates,
            "geometry": geometry,
            "steps": steps,
            "alternate_routes": alternate_routes,
            "alternate_route_details": alternate_details,
            "prediction_method": prediction_method,
            "predicted_hours": ml_prediction["hours"],
            "ml_estimated_time": ml_prediction["time"],
            "osrm_estimated_time": osrm_time,
            "source": source,
            "destination": destination,
        }

        return jsonify(response), 200

    except Exception as e:
        print(f"Error in predict_route: {str(e)}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint reporting graph and ML model availability."""
    return jsonify({
        "status": "healthy",
        "graph_loaded": road_network is not None,
        "model_loaded": ml_model is not None,
        "nodes_count": road_network.number_of_nodes() if road_network else 0,
        "edges_count": road_network.number_of_edges() if road_network else 0,
        "cities_available": sorted(list(CITY_COORDS.keys())),
    }), 200


@app.route('/cities', methods=['GET'])
def get_cities():
    """Get list of available cities."""
    return jsonify({
        "cities": sorted(list(CITY_COORDS.keys())),
        "count": len(CITY_COORDS),
    }), 200


# Initialize graph and ML model on module load so imports, tests, and WSGI servers are immediately ready
load_graph()
load_ml_model()


if __name__ == '__main__':
    print("Starting Flask API server...")
    debug_enabled = os.getenv("FLASK_DEBUG", "").lower() in {"1", "true", "yes"}
    app.run(host='0.0.0.0', port=5000, debug=debug_enabled, use_reloader=debug_enabled, threaded=True)
