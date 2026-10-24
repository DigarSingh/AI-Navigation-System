# 🚀 Quick Start Guide

Get the AI Navigation System up and running in 5 minutes!

## ⚡ Quick Install & Run

### Step 1: Install Node.js Dependencies (2 min)

```bash
cd ai_nav
npm install
```

This installs Next.js, React, Tailwind CSS, Leaflet, and all frontend dependencies.

### Step 2: Install Python Dependencies (3 min)

```bash
cd python-backend
python -m venv venv

# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

This installs Flask, NetworkX, OSMnx, scikit-learn, and ML libraries.

### Step 3: Start Flask Backend

In the terminal with activated virtual environment:

```bash
python app.py
```

You should see:
```
Starting Flask API...
Graph loaded with 15 nodes and 21 edges
Flask API ready!
 * Running on http://127.0.0.1:5000
```

### Step 4: Start Next.js Frontend

Open a **new terminal**:

```bash
cd ai_nav
npm run dev
```

You should see:
```
▲ Next.js 14.2.3
- Local:        http://localhost:3000
✓ Ready in 2.3s
```

### Step 5: Open in Browser

Navigate to: **http://localhost:3000**

## 🎯 Test It Out

1. **Source**: Enter "Delhi"
2. **Destination**: Enter "Mumbai"
3. Click **"Find Best Route"**
4. Watch the magic happen! ✨

You should see:
- 📍 Route displayed on the map
- 🛣️ Path with waypoints (Delhi → Jaipur → Ahmedabad → Mumbai)
- 📊 Distance (~1420 km)
- ⏱️ Estimated time (~23 hours)

## 🎨 Try Different Routes

### Short Distance
- Source: **Mumbai** → Destination: **Pune** (150 km)

### Medium Distance
- Source: **Bangalore** → Destination: **Chennai** (350 km)

### Long Distance
- Source: **Delhi** → Destination: **Kolkata** (1500 km)

## 📁 Project Structure

```
ai_nav/
├── app/                    # Next.js pages & API
│   ├── api/
│   │   └── shortest-path/  # API endpoint
│   ├── page.tsx            # Main page
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── NavigationForm.tsx  # Input form
│   ├── MapView.tsx         # Map display
│   └── RouteDetails.tsx    # Route info
├── python-backend/         # Flask API
│   ├── app.py              # Main Flask app
│   └── requirements.txt    # Python deps
└── navigation_model.ipynb  # Jupyter notebook
```

## 🐛 Common Issues

### Port 5000 Already in Use?
```bash
# Change Flask port in app.py (last line):
app.run(host='0.0.0.0', port=5001, debug=True)

# Update .env.local:
FLASK_API_URL=http://localhost:5001
```

### "Cannot find module" errors?
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Python module not found?
```bash
# Make sure virtual environment is activated
# You should see (venv) in your prompt
pip install -r requirements.txt
```

## 📚 Next Steps

1. **Explore the Code**
   - Check out `app/page.tsx` for React components
   - Look at `python-backend/app.py` for API logic
   - Open `navigation_model.ipynb` for ML model

2. **Read Documentation**
   - `README.md` - Full documentation
   - `SETUP_GUIDE.md` - Detailed setup instructions
   - `ARCHITECTURE.md` - System architecture

3. **Customize**
   - Add more cities in `python-backend/app.py`
   - Modify UI styles in components
   - Train your own ML model in Jupyter notebook

## 🎉 You're Ready!

The AI Navigation System is now running on your machine.

**Frontend**: http://localhost:3000  
**Backend API**: http://localhost:5000

Happy route planning! 🗺️✨

---

Need help? Check `SETUP_GUIDE.md` for troubleshooting.
