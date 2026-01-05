# Testing ML Quality Crawler - Recommended Approach

## 🎯 What to Test First

### Phase 1: Basic ML Scoring (Start Here)

**Goal**: Verify ML model is working and scoring organizations correctly.

**Steps**:
1. **Train the model** (if not already done):
   ```bash
   cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse"
   node server/scripts/trainMLModel.js
   ```

2. **Run a small test crawl**:
   ```bash
   node server/scripts/runCrawlerLocal.js 20e
   ```

3. **Check the results**:
   - Open Google Sheets → "Pending - YYYY-MM-DD - Arrondissement Crawler" tab
   - Look for `additionalNotes` column - should show "ML Score: X.XX/10 (ml)"
   - Verify scores make sense (higher scores for relevant kids' activities)

**Expected Results**:
- ✅ Model trains successfully (loss decreases, MAE ~1.1)
- ✅ Organizations get scored 0-10
- ✅ Scores visible in Google Sheets
- ✅ Higher scores for relevant activities (kids, sports, etc.)

---

### Phase 2: Feedback Collection

**Goal**: Collect user feedback (approve/reject) to improve the model.

**Steps**:
1. **Review pending activities** in Google Sheets
2. **Mark approval status**:
   - Set `approvalStatus` column to `approved` for good organizations
   - Set `approvalStatus` column to `rejected` for irrelevant ones
3. **Save the sheet**

**What to approve**:
- ✅ Organizations offering kids' activities (sports, arts, etc.)
- ✅ Located in 20e arrondissement or nearby
- ✅ Have contact information (email/phone/website)
- ✅ Age range appropriate for children

**What to reject**:
- ❌ Adult-only organizations
- ❌ Generic nonprofits without activities
- ❌ Newsletters or information pages
- ❌ Organizations outside target area
- ❌ Organizations without contact info

---

### Phase 3: Retrain with Feedback

**Goal**: Improve model by learning from your feedback.

**Steps**:
1. **After collecting feedback** (at least 10-20 approve/reject decisions):
   ```bash
   node server/scripts/retrainMLModel.js
   ```

2. **Check retraining results**:
   - Model should retrain on original 132 + your feedback
   - Test accuracy should improve over time

3. **Run crawler again**:
   ```bash
   node server/scripts/runCrawlerLocal.js 20e
   ```

4. **Compare results**:
   - New scores should be more accurate
   - Fewer false positives (rejected organizations getting high scores)
   - More true positives (approved organizations getting high scores)

---

### Phase 4: Iterative Improvement Loop

**Goal**: Continuously improve model through multiple cycles.

**Recommended Cycle** (repeat 3-5 times):

```bash
# 1. Run crawler
node server/scripts/runCrawlerLocal.js 20e

# 2. Review results in Google Sheets
#    - Approve good organizations
#    - Reject bad ones
#    - Collect at least 10-20 decisions

# 3. Retrain model with feedback
node server/scripts/retrainMLModel.js

# 4. Run crawler again (see improved results)
node server/scripts/runCrawlerLocal.js 20e

# 5. Repeat from step 2
```

**Expected Improvement**:
- **Week 1**: Baseline accuracy ~60-70%
- **Week 2**: After first feedback cycle ~70-80%
- **Week 3**: After second cycle ~80-85%
- **Week 4+**: After multiple cycles ~85-90%+

---

## 📊 Metrics to Track

### During Training:
- **Loss**: Should decrease (e.g., 96 → 1.9)
- **MAE (Mean Absolute Error)**: Should decrease (e.g., 9.8 → 1.1)
- **Training time**: ~5-30 minutes for 132 activities

### During Scoring:
- **Average ML Score**: Should be higher for approved organizations
- **Score Distribution**: 
  - Approved: Should cluster around 7-10
  - Rejected: Should cluster around 0-5
- **False Positive Rate**: Should decrease over time

### During Retraining:
- **Test Accuracy**: Should improve with each cycle
- **Feedback Examples**: More feedback = better learning

---

## 🧪 Quick Test Commands

### Test 1: Verify Model Training
```bash
node server/scripts/trainMLModel.js
```
**Expected**: Model trains, shows loss/MAE, tests on 3 sample activities

### Test 2: Verify ML Scoring Works
```bash
node server/scripts/runCrawlerLocal.js 20e
```
**Expected**: Crawler runs, scores organizations, saves to Google Sheets with ML scores

### Test 3: Verify Feedback Loading
```bash
node server/scripts/retrainMLModel.js
```
**Expected**: Loads original activities + feedback, retrains model, shows test accuracy

---

## 🎯 Success Criteria

### Initial Test (Phase 1):
- ✅ Model trains without errors
- ✅ Organizations get scored
- ✅ Scores are reasonable (not all 0 or all 10)

### After First Feedback (Phase 3):
- ✅ Model retrains successfully
- ✅ Test accuracy > 70%
- ✅ Scores improve for approved organizations

### After Multiple Cycles (Phase 4):
- ✅ Test accuracy > 85%
- ✅ False positive rate < 15%
- ✅ Average score for approved > 8.0
- ✅ Average score for rejected < 4.0

---

## 💡 Tips

1. **Start Small**: Test with 20e arrondissement first
2. **Collect Quality Feedback**: Take time to review and mark correctly
3. **Be Consistent**: Use same criteria for approve/reject
4. **Track Progress**: Note accuracy improvements over time
5. **Be Patient**: ML models improve gradually with more data

---

## 🚨 Troubleshooting

### Model not training:
- Check Google Sheets connection
- Verify 132 activities are loaded
- Check TensorFlow.js installation

### Scores all the same:
- Model may need more training epochs
- Try retraining with feedback
- Check feature extraction

### Low accuracy:
- Need more feedback examples (aim for 20+)
- Review feedback quality (consistent criteria?)
- Model may need more training data

---

**Ready to start? Begin with Phase 1!** 🚀

