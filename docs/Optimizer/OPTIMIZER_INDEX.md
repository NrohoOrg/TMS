# Optimizer Documentation Index

Complete guide to understanding the TMS Optimizer service.

---

## 📚 Documentation Structure

We've created a comprehensive 4-part guide to help you understand the Optimizer from every angle:

### 1. **[OPTIMIZER_NARRATIVE.md](./OPTIMIZER_NARRATIVE.md)** — Start Here! 📖

**Best for:** Understanding the "why" and "what"

- What problem does it solve?
- The high-level story (non-technical)
- Real-world scenario walkthrough
- Common mistakes to avoid
- Tuning tips
- Success indicators

**Reading time:** 15 minutes
**Best for:** Managers, product leads, new team members

---

### 2. **[OPTIMIZER_QUICK_REFERENCE.md](./OPTIMIZER_QUICK_REFERENCE.md)** — The Cheat Sheet 🚀

**Best for:** Developers who need quick answers

- Quick start (how to run it)
- Parameter definitions with tables
- Response format examples
- Time format conversion table
- Common issues & solutions
- Testing with curl

**Reading time:** 10 minutes
**Best for:** Developers, DevOps, QA

---

### 3. **[OPTIMIZER_GUIDE.md](./OPTIMIZER_GUIDE.md)** — The Deep Dive 🔬

**Best for:** Comprehensive technical understanding

- Complete API endpoint documentation
- Full request/response specifications
- Architecture overview
- Step-by-step solving process
- Integration with backend
- Troubleshooting guide
- Performance tips

**Reading time:** 45 minutes
**Best for:** Backend engineers, optimization specialists

---

### 4. **[OPTIMIZER_DIAGRAMS.md](./OPTIMIZER_DIAGRAMS.md)** — Visual Explanations 🎨

**Best for:** Visual learners

- System overview diagram
- Internal flow chart (step by step)
- Data structure examples
- Constraint visualizations
- Performance profiles
- Integration sequence diagram

**Reading time:** 20 minutes
**Best for:** Visual learners, architects, technical leads

---

## 🎯 Quick Navigation

### I'm a...

**Manager / Product Owner**
→ Read: OPTIMIZER_NARRATIVE.md (sections 1-3)
→ Time: 10 min
→ Know: What it does, why it matters, how it impacts the system

**New Developer**
→ Read: OPTIMIZER_NARRATIVE.md → OPTIMIZER_QUICK_REFERENCE.md
→ Time: 25 min
→ Know: How to run it, test it, and troubleshoot basic issues

**Backend Engineer**
→ Read: OPTIMIZER_GUIDE.md → OPTIMIZER_DIAGRAMS.md
→ Time: 60 min
→ Know: Full API, integration points, performance tuning

**DevOps / Infrastructure**
→ Read: OPTIMIZER_QUICK_REFERENCE.md (Quick Start) → OPTIMIZER_GUIDE.md (Running section)
→ Time: 15 min
→ Know: How to start/stop, environment setup, health checks

**Optimization Specialist**
→ Read: OPTIMIZER_GUIDE.md → OPTIMIZER_DIAGRAMS.md (Performance)
→ Time: 90 min
→ Know: Solver algorithm, constraint model, tuning strategies

---

## 🚀 Getting Started (5 Minutes)

### 1. Start the Optimizer

```bash
cd apps/optimizer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Health Check

```bash
curl http://localhost:8000/health
# Response: {"status": "ok", "service": "optimizer"}
```

### 3. Send a Test Request

```bash
curl -X POST http://localhost:8000/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test-1",
    "config": {
      "maxSolveSeconds": 30,
      "speedKmh": 40,
      "returnToDepot": false
    },
    "drivers": [
      {
        "id": "d1",
        "shiftStartS": 28800,
        "shiftEndS": 61200,
        "depotLat": 36.7,
        "depotLng": 3.0,
        "capacityUnits": null
      }
    ],
    "tasks": [
      {
        "id": "t1",
        "priority": "normal",
        "pickupLat": 36.75,
        "pickupLng": 3.05,
        "pickupWindowStartS": 32400,
        "pickupWindowEndS": 36000,
        "pickupServiceS": 600,
        "dropoffLat": 36.80,
        "dropoffLng": 3.10,
        "dropoffDeadlineS": 50400,
        "dropoffServiceS": 300,
        "capacityUnits": 1
      }
    ]
  }'
```

### 4. See the Result

You'll get back:
```json
{
  "jobId": "test-1",
  "status": "completed",
  "routes": [
    {
      "driverId": "d1",
      "stops": [...],
      "totalDistanceM": 12345,
      "totalTimeS": 4500
    }
  ],
  "unassigned": []
}
```

✅ **Success!** The optimizer is working.

---

## 📋 Key Concepts At a Glance

| Concept | Meaning | Example |
|---------|---------|---------|
| **Job** | A single optimization request | "Optimize March 8 tasks" |
| **Driver** | A vehicle with time/capacity limits | Ahmed, works 8 AM-5 PM, capacity 10 units |
| **Task** | A pickup-delivery pair | "Pick up at warehouse, deliver at hotel" |
| **Route** | The sequence of stops for one driver | Pickup A → Pickup B → Dropoff A → Dropoff B |
| **Stop** | A single pickup or dropoff | "Pickup at Rue Didouche, 9:30 AM" |
| **Time Window** | Valid time range for an action | "Can only pick up between 9-10 AM" |
| **Unassigned** | Task couldn't fit in any route | "Not enough time / capacity" |
| **Seconds Since Midnight** | Time format used (0-86400) | 32400 = 9 AM, 50400 = 2 PM |

---

## 🔗 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| GET | `/optimizer/health` | Detailed health check |
| POST | `/optimize` | Solve a routing problem |

**Base URL:** `http://localhost:8000`

---

## 🛠️ Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | Python | 3.8+ |
| API Framework | FastAPI | 0.111.0 |
| Web Server | Uvicorn | 0.29.0 |
| Solver | Google OR-Tools | 9.10.4067 |
| Validation | Pydantic | 2.7.1 |

---

## 📊 Performance Guidelines

| Metric | Typical Value | Range |
|--------|---------------|-------|
| Solve Time (small) | 2-5 sec | 50 tasks, 5 drivers |
| Solve Time (medium) | 15-30 sec | 200 tasks, 20 drivers |
| Solve Time (large) | 30-60 sec | 500+ tasks, 50+ drivers |
| Assignment Rate | 85-95% | Varies by constraints |
| Route Distance | Varies | Optimal within time limit |

---

## ❓ FAQ

### Q: How accurate are the distance calculations?

**A:** Uses Haversine formula on WGS84 coordinates, accurate to ±0.5% for small distances (<100 km).

### Q: Can it handle real-time updates?

**A:** Not directly. Re-run optimization with updated task list when needed.

### Q: What if I want to prioritize certain tasks?

**A:** Use the `priority` field: "urgent" gets highest weight, "low" gets lowest.

### Q: How do I improve solution quality?

**A:** Increase `maxSolveSeconds` (costs latency), or split into smaller batches.

### Q: Does it guarantee the optimal solution?

**A:** No, it's a heuristic solver (practical, not perfect). It finds very good solutions quickly.

### Q: What happens if constraints are infeasible?

**A:** Solver returns best partial solution with unassigned tasks + reasons.

---

## 🐛 Troubleshooting Checklist

- [ ] Optimizer running on port 8000? (`lsof -i :8000`)
- [ ] Database/backend running on port 3001? (`curl http://localhost:3001/health`)
- [ ] Redis running on port 6379? (`redis-cli ping`)
- [ ] Times in seconds-since-midnight (not Unix timestamp)?
- [ ] Driver capacities large enough for tasks?
- [ ] Time windows not contradictory?
- [ ] At least one driver in request?
- [ ] Python dependencies installed? (`pip install -r requirements.txt`)

---

## 📖 Recommended Reading Order

1. **First time?** → OPTIMIZER_NARRATIVE.md
2. **Need to use it?** → OPTIMIZER_QUICK_REFERENCE.md
3. **Troubleshooting?** → OPTIMIZER_GUIDE.md (Troubleshooting section)
4. **Want to understand deeply?** → OPTIMIZER_DIAGRAMS.md
5. **Advanced tuning?** → OPTIMIZER_GUIDE.md (Performance Tips)

---

## 🤝 Support

### Common Issues

**Issue:** `ModuleNotFoundError: No module named 'ortools'`
**Solution:** `pip install -r requirements.txt`

**Issue:** All tasks `TIME_WINDOW_INFEASIBLE`
**Solution:** Check time windows and driver shifts overlap

**Issue:** Solver `TIMEOUT` frequently
**Solution:** Increase `maxSolveSeconds` or split batch size

**Issue:** `NO_DRIVER_AVAILABLE`
**Solution:** Ensure drivers list is not empty

### Getting Help

- Check **Troubleshooting** section in OPTIMIZER_GUIDE.md
- Review examples in OPTIMIZER_QUICK_REFERENCE.md
- Examine diagrams in OPTIMIZER_DIAGRAMS.md

---

## 📞 Integration Points

### Backend API → Optimizer

```
POST http://optimizer:8000/optimize
{jobId, config, drivers, tasks}
↓
Backend stores Plan, Routes, Stops in database
↓
Frontend displays routes to dispatcher
```

### Frontend → Backend → Optimizer

```
Dispatcher: "Optimize March 8"
   ↓
Backend: GET tasks + drivers for March 8
   ↓
Backend: Call Optimizer
   ↓
Optimizer: Solve and return routes
   ↓
Backend: Store in database
   ↓
Frontend: Show routes on map
```

---

## 📈 Next Steps

1. ✅ **Understand** — Read OPTIMIZER_NARRATIVE.md
2. ✅ **Install** — Follow Quick Start section
3. ✅ **Test** — Send curl request to /optimize
4. ✅ **Integrate** — Check how backend calls it
5. ✅ **Monitor** — Track solve times and assignment rates
6. ✅ **Tune** — Adjust parameters based on results

---

## 📚 Additional Resources

- [Google OR-Tools Documentation](https://developers.google.com/optimization)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [Vehicle Routing Problem](https://en.wikipedia.org/wiki/Vehicle_routing_problem)

---

**Last Updated:** March 23, 2026  
**Version:** 1.0  
**Maintainer:** TMS Team
