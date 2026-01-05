# ML Architecture Local Execution Feasibility

## ✅ YES - ML Can Run Locally on Your Computer

The ML architecture is **fully designed to run locally** on your Mac/PC without requiring cloud services or external APIs.

---

## Technology Options

### Option 1: TensorFlow.js (Recommended)

**Framework**: TensorFlow.js for Node.js  
**Installation**: `npm install @tensorflow/tfjs-node`

**Pros**:
- ✅ Pure Node.js - no Python dependency
- ✅ Runs in same process as crawler (fast communication)
- ✅ Good performance for small-medium models
- ✅ Easy to deploy and maintain
- ✅ Works on any modern Mac/PC (CPU-based)

**Performance**:
- **Inference**: ~1-5ms per organization (very fast)
- **Training**: ~5-30 minutes for 132 activities (acceptable for overnight runs)
- **Memory**: ~100-500MB for model + data

**Hardware Requirements**:
- Any modern Mac/PC (2015+)
- 4GB+ RAM (8GB recommended)
- No GPU required (CPU-based inference)

**Example Code**:
```javascript
import * as tf from '@tensorflow/tfjs-node';

// Load or create model
const model = tf.sequential({
  layers: [
    tf.layers.dense({ inputShape: [50], units: 32, activation: 'relu' }),
    tf.layers.dense({ units: 16, activation: 'relu' }),
    tf.layers.dense({ units: 1, activation: 'sigmoid' })
  ]
});

// Train on existing 132 activities
await model.fit(trainingFeatures, trainingLabels, {
  epochs: 100,
  batchSize: 32
});

// Score new organization
const score = await model.predict(features).data();
```

---

### Option 2: Python Bridge (More Powerful)

**Framework**: scikit-learn via child process  
**Installation**: Requires Python 3.8+ and scikit-learn

**Pros**:
- ✅ More ML algorithms available (Random Forest, Gradient Boosting, SVM)
- ✅ Better for complex models
- ✅ Industry standard
- ✅ More mature ecosystem

**Cons**:
- ❌ Requires Python installation
- ❌ Inter-process communication overhead (~10-50ms per prediction)

**Performance**:
- **Inference**: ~10-50ms per organization (still fast)
- **Training**: ~2-10 minutes for 132 activities
- **Memory**: ~200-800MB for model + data

**Hardware Requirements**:
- Any modern Mac/PC (2015+)
- 4GB+ RAM (8GB recommended)
- Python 3.8+ installed

**Example Code**:
```javascript
// Node.js side
const { spawn } = require('child_process');
const python = spawn('python3', ['ml_scorer.py', JSON.stringify(features)]);

python.stdout.on('data', (data) => {
  const score = JSON.parse(data.toString());
  // Use score
});
```

```python
# Python side (ml_scorer.py)
import sys
import json
from sklearn.ensemble import RandomForestClassifier

# Load trained model
model = joblib.load('quality_model.pkl')

# Predict
features = json.loads(sys.argv[1])
score = model.predict_proba([features])[0][1]
print(json.dumps({'score': score * 10}))  # Scale to 0-10
```

---

## Recommended Approach

**Start with TensorFlow.js (Option 1)** because:
1. ✅ No external dependencies (pure Node.js)
2. ✅ Easier to deploy and maintain
3. ✅ Fast enough for our use case
4. ✅ Can always switch to Python later if needed

**Switch to Python Bridge (Option 2)** if:
- Need more advanced ML algorithms
- Model becomes too complex for TensorFlow.js
- Need better performance for large datasets

---

## Training Data: Using All Available Fields

The existing **132 activities** will be used as training data with **ALL available fields**:

### Text Features
- `title_en`, `title_fr` - Organization names
- `description_en`, `description_fr` - Descriptions
- `activityType` - Activity type
- `categories` - Array of categories
- `additionalNotes` - Additional information

### Contact Features
- `contactEmail` - Email presence and format
- `contactPhone` - Phone presence and format
- `websiteLink` - Website presence
- `registrationLink` - Registration link presence

### Geographic Features
- `neighborhood` - Neighborhood/arrondissement
- `addresses` - Address parsing

### Age Features
- `ageMin`, `ageMax` - Age range
- `adults` - Adults allowed flag

### Pricing Features
- `price_amount` - Price amount
- `currency` - Currency code

### Availability Features
- `disponibiliteJours` - Available days
- `disponibiliteDates` - Available dates

### Metadata Features
- `providerId` - Provider identifier
- `crawledAt` - When crawled
- `createdAt`, `updatedAt` - Timestamps

---

## Feature Engineering

Each field will be converted to numerical features:

1. **Text Fields**: 
   - Keyword extraction (kids, enfant, sport, activité, etc.)
   - Text length
   - Language detection
   - Keyword density

2. **Contact Fields**:
   - Presence (0/1)
   - Format validity (0/1)
   - Completeness score (0-1)

3. **Geographic Fields**:
   - Arrondissement match (0/1)
   - Address completeness (0-1)
   - Postal code extraction

4. **Age Fields**:
   - Age range appropriateness (0-1)
   - Kids' activity indicator (0/1)

5. **Pricing Fields**:
   - Price presence (0/1)
   - Price range (normalized 0-1)

6. **Availability Fields**:
   - Schedule completeness (0-1)
   - Date range validity (0/1)

**Total Features**: ~50-100 numerical features per organization

---

## Model Architecture

### Initial Model (TensorFlow.js)
```javascript
const model = tf.sequential({
  layers: [
    // Input: 50-100 features
    tf.layers.dense({ 
      inputShape: [featureCount], 
      units: 64, 
      activation: 'relu' 
    }),
    tf.layers.dropout({ rate: 0.2 }),
    tf.layers.dense({ units: 32, activation: 'relu' }),
    tf.layers.dropout({ rate: 0.2 }),
    // Output: Single score (0-10)
    tf.layers.dense({ units: 1, activation: 'linear' })
  ]
});

model.compile({
  optimizer: 'adam',
  loss: 'meanSquaredError',
  metrics: ['mae']
});
```

### Training Process
1. Load 132 activities from Google Sheets
2. Extract all features from all fields
3. Label all as "approved" (score = 10)
4. Train model for 100-200 epochs
5. Save model to disk
6. Use for inference during crawls

---

## Performance Expectations

### During 8-Hour Crawl
- **Organizations Discovered**: 50-200 per arrondissement
- **ML Scoring Time**: ~1-5ms per organization
- **Total ML Overhead**: <1 second per 100 organizations
- **Acceptable**: Yes, negligible impact on crawl time

### Model Training (Overnight)
- **Initial Training** (132 activities): ~5-30 minutes
- **Retraining** (after feedback): ~10-60 minutes
- **Frequency**: After each crawl session
- **Acceptable**: Yes, runs during learning phase (30 min allocated)

---

## Memory Usage

- **Model Size**: ~1-5MB (small neural network)
- **Training Data**: ~100-500KB (132 activities)
- **Inference Memory**: ~50-200MB (during crawl)
- **Total**: <500MB
- **Acceptable**: Yes, well within modern computer limits

---

## Conclusion

✅ **ML architecture can run locally** on your computer  
✅ **TensorFlow.js recommended** for simplicity  
✅ **All 132 activities** will be used with **all available fields**  
✅ **Performance is acceptable** for 8-hour overnight runs  
✅ **No cloud services required**  

**Ready to proceed with implementation!**

