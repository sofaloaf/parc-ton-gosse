# Iterative Training Guide - How Model Learns from Rejections

## 🔧 Critical Fix Applied

**The model now learns from rejections!** Previously, it was training all examples as "approved" (score 10), ignoring your rejections. This is now fixed.

---

## 🎯 How It Works Now

### 1. Model Training with Labels

**Before (BROKEN)**:
- All activities labeled as 10 (approved)
- Rejections ignored
- Model never learned what to avoid

**After (FIXED)**:
- Approved activities = label 10
- Rejected activities = label 0
- Model learns both positive and negative examples

### 2. Adaptive Search Strategy

**New Feature**: The crawler now tracks:
- Which keyword combinations led to rejections
- Which search sources work best
- Patterns that consistently fail

**Behavior**:
- Avoids repeating failed patterns
- Cycles through different keyword combinations
- Prioritizes successful search strategies

### 3. Enhanced Discovery

**New Priority**: Databases and PDFs first
- Searches Wikidata (structured data)
- Extracts from PDFs on municipal sites
- Focuses on authoritative sources
- Less reliance on general web searches

---

## 📋 Recommended Testing Workflow

### Step 1: Retrain with Your Feedback

After you've marked some activities as `approved` or `rejected` in Google Sheets:

```bash
cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"
node server/scripts/retrainMLModel.js
```

**What this does**:
- Loads original 132 activities (all approved = 10)
- Loads your feedback (approved = 10, rejected = 0)
- Trains model with **actual labels** (not all 10!)
- Shows test accuracy on your feedback

**Expected output**:
```
✅ Loaded 20 feedback examples:
   - Approved: 12
   - Rejected: 8

📊 Training data summary:
   - Total examples: 152
   - Positive (approved): 144
   - Negative (rejected): 8

🎓 Retraining model with combined data...
   (Original activities + user feedback with actual labels)

✅ Retraining completed successfully!
   Model now knows: 144 approved vs 8 rejected examples
```

### Step 2: Run Crawler Again

```bash
node server/scripts/runCrawlerLocal.js 20e
```

**What's different now**:
- Model uses learned patterns (avoids rejected types)
- Enhanced discovery searches databases/PDFs first
- Adaptive search cycles through keywords
- Avoids patterns that led to rejections

### Step 3: Review Results

Check Google Sheets for:
- **ML Scores**: Should be lower for rejected types
- **New Sources**: More from databases/PDFs
- **Different Organizations**: Should avoid repeating rejected ones

### Step 4: Repeat

```bash
# 1. Mark approve/reject in Google Sheets (collect 10-20 more)

# 2. Retrain
node server/scripts/retrainMLModel.js

# 3. Run crawler
node server/scripts/runCrawlerLocal.js 20e

# 4. Repeat from step 1
```

---

## 🔍 What to Look For

### Signs Model is Learning:

✅ **After retraining**:
- Test accuracy improves (e.g., 60% → 75% → 85%)
- Model correctly predicts your approve/reject decisions

✅ **After crawling**:
- Fewer organizations matching rejected patterns
- More diverse results (different keywords/sources)
- Higher scores for approved types, lower for rejected types

✅ **Adaptive search stats**:
- Shows which patterns work vs fail
- Avoids repeating rejected patterns
- Cycles through different keyword combinations

### Signs Something's Wrong:

❌ **Model not learning**:
- Test accuracy stays the same or decreases
- Same organizations keep appearing
- Scores don't change after retraining

**Fix**: Check that you're marking `approvalStatus` correctly in Google Sheets

---

## 🎓 Training Tips

1. **Be Consistent**: Use same criteria for approve/reject
2. **More Feedback = Better**: Aim for 20+ decisions per cycle
3. **Quality Over Quantity**: Better to have 10 good decisions than 50 inconsistent ones
4. **Track Progress**: Note accuracy improvements over time
5. **Be Patient**: Model improves gradually (not instantly)

---

## 📊 Expected Improvement Timeline

- **Cycle 1**: Baseline (132 activities only)
- **Cycle 2**: After first feedback (10-20 decisions) → +10-15% accuracy
- **Cycle 3**: After second feedback → +20-25% accuracy
- **Cycle 4+**: After multiple cycles → +30-40% accuracy

---

## 🚀 Quick Commands

```bash
# Retrain with feedback
node server/scripts/retrainMLModel.js

# Run crawler (will use improved model)
node server/scripts/runCrawlerLocal.js 20e

# Check adaptive search stats (in crawler output)
# Look for "Adaptive Search Statistics" section
```

---

**The model will now change its approach based on rejections!** 🎉

