# Interactive Review and Improvement System

This system allows you to review enrichment results, provide feedback, and automatically improve the search strategies.

## How It Works

1. **Run the Review Script**: `node server/scripts/reviewAndImproveEnrichment.js`
2. **Review Results**: The script shows you what websites were found (or not found)
3. **Provide Feedback**: For each result, you can:
   - Mark it as correct (y)
   - Mark it as incorrect and provide the correct website (n)
   - Skip it (skip)
4. **Automatic Learning**: The system learns from your feedback:
   - Records incorrect websites to avoid them in the future
   - Adjusts search strategy weights based on what works
   - Remembers organizations that don't have websites
5. **Iterative Improvement**: The script reruns with improved strategies until you're satisfied
6. **Final Approval**: Once satisfied, you can approve the final results

## Features

- **Learning Data**: Saves learning data to `server/data/enrichment-learning.json`
- **Strategy Weighting**: Automatically adjusts which search strategies to prioritize
- **Incorrect Website Tracking**: Remembers wrong websites to avoid them
- **No Website Confirmation**: Remembers organizations that don't have websites
- **Sample Mode**: First iteration processes 50 organizations for quick review

## Usage

```bash
# Run the interactive review system
node server/scripts/reviewAndImproveEnrichment.js
```

## Learning Data Structure

The system saves learning data in JSON format:
- `successfulQueries`: Queries that successfully found correct websites
- `failedOrganizations`: Organizations confirmed to have no website
- `incorrectWebsites`: Websites that were found but are wrong
- `searchStrategyWeights`: Weights for each search strategy (higher = more likely to use)
- `keywordAdjustments`: Custom keyword adjustments

## Workflow

1. **First Run**: Reviews 50 organizations as a sample
2. **Feedback Loop**: You review results and provide feedback
3. **Automatic Adjustment**: System adjusts strategies based on feedback
4. **Rerun**: Script reruns with improved strategies
5. **Repeat**: Continue until satisfied
6. **Final Run**: Processes all organizations with learned strategies
7. **Approval**: Final results shown for approval

## Tips

- Start with a small sample (first iteration is 50 orgs)
- Focus on reviewing organizations where websites were found incorrectly
- If you know a website exists but wasn't found, mark it as incorrect and provide the URL
- The system learns from each iteration, so results improve over time

