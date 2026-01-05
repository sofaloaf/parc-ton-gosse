# ML-Based Quality-Focused Crawler Design

## Executive Summary

This document outlines the design for an advanced, machine learning-powered web crawler that prioritizes **quality and accuracy** over speed. Designed to run for up to 8 hours overnight on a local machine, this crawler uses active learning, reinforcement learning, and iterative quality improvement to discover and validate children's activity organizations in Paris.

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ML Quality Crawler System                    │
│                    (8-hour overnight runs)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  ML Quality  │   │  Active      │   │  Proven      │
│  Scorer      │   │  Learning    │   │  Strategies  │
│  (Grading)   │   │  (Feedback)   │   │  (Modules)   │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Priority     │   │  Iterative    │   │  Quality      │
│  Queue        │   │  Refinement   │   │  Database     │
│  (RL-based)   │   │  (Self-learn) │   │  (Training)   │
└───────────────┘   └───────────────┘   └───────────────┘
```

### 1.2 Core Components

1. **ML Quality Scorer**: Machine learning model that grades each discovered organization
2. **Active Learning Module**: Learns from user feedback (approve/reject) to improve predictions
3. **Reinforcement Learning Agent**: Optimizes crawling strategy based on quality outcomes
4. **Proven Strategy Integrator**: Incorporates existing successful crawlers (LocalityFirst, Mairie, Intelligent)
5. **Iterative Refinement Engine**: Self-improves by analyzing successful vs. failed discoveries
6. **Quality Database**: Stores training data, feedback, and quality metrics

---

## 2. Detailed Component Design

### 2.1 ML Quality Scorer

**Purpose**: Grade each discovered organization on a 0-10 scale for relevance and quality.

**Features**:
- **Multi-factor scoring model**:
  - Relevance to kids' activities (0-3 points)
  - Data completeness (0-2 points)
  - Source authority (0-2 points)
  - Geographic relevance (0-2 points)
  - Contact information quality (0-1 point)

- **Model Architecture**:
  - **Initial Model**: Rule-based + simple ML (Random Forest or Gradient Boosting)
  - **Evolution**: Gradually transition to deep learning (neural network) as training data accumulates
  - **Features** (extracted from all available fields):
    - **Text Features** (from existing activities):
      - Organization name (`title_en`, `title_fr`) - keyword extraction, length, language
      - Description (`description_en`, `description_fr`) - keyword density, completeness
      - Activity type (`activityType`) - category matching
      - Categories (`categories`) - array of activity categories
      - Additional notes (`additionalNotes`) - supplementary information
    - **Contact Features**:
      - Email presence and format (`contactEmail`)
      - Phone presence and format (`contactPhone`)
      - Website presence and quality (`websiteLink`)
      - Registration link presence (`registrationLink`)
    - **Geographic Features**:
      - Neighborhood (`neighborhood`) - arrondissement matching
      - Addresses (`addresses`) - address parsing, postal code extraction
    - **Age Features**:
      - Age range (`ageMin`, `ageMax`) - kids' activity validation
      - Adults flag (`adults`) - adult-only filter
    - **Pricing Features**:
      - Price amount (`price_amount`) - pricing completeness
      - Currency (`currency`) - standard format
    - **Availability Features**:
      - Days (`disponibiliteJours`) - schedule completeness
      - Dates (`disponibiliteDates`) - date range validation
    - **Structural Features**:
      - Website structure analysis (if website exists)
      - Data completeness score (how many fields are filled)
    - **Source Features**:
      - Domain authority (mairie, official registry, etc.)
      - Source type (mairie, locality-first, intelligent, advanced)
    - **Historical Features**:
      - Similar organizations' approval rates
      - Provider ID patterns (`providerId`)

- **Training Data Sources**:
  - **Existing 132 activities** (ground truth - all approved)
    - **Rich feature set**: Uses ALL available fields for training:
      - Text features: `title_en`, `title_fr`, `description_en`, `description_fr`, `activityType`, `categories`, `additionalNotes`
      - Contact features: `contactEmail`, `contactPhone`, `websiteLink`, `registrationLink`
      - Geographic features: `neighborhood`, `addresses`
      - Age features: `ageMin`, `ageMax`, `adults`
      - Pricing features: `price_amount`, `currency`
      - Availability features: `disponibiliteJours`, `disponibiliteDates`
      - Metadata: `providerId`, `crawledAt`, `createdAt`, `updatedAt`
  - User-approved organizations (positive examples from future crawls)
  - User-rejected organizations (negative examples from future crawls)
  - External validation: Cross-reference with official registries

**Implementation**:
```javascript
class MLQualityScorer {
  constructor() {
    this.model = null; // Load trained model
    this.featureExtractor = new FeatureExtractor();
    this.confidenceThreshold = 7.0; // Only accept scores >= 7
  }

  async score(organization) {
    const features = this.featureExtractor.extract(organization);
    const score = await this.model.predict(features);
    const confidence = this.model.getConfidence(features);
    
    return {
      score: score, // 0-10
      confidence: confidence, // 0-1
      breakdown: {
        relevance: features.relevanceScore,
        completeness: features.completenessScore,
        authority: features.authorityScore,
        geographic: features.geographicScore,
        contact: features.contactScore
      },
      recommendation: score >= this.confidenceThreshold ? 'accept' : 'review'
    };
  }
}
```

### 2.2 Active Learning Module

**Purpose**: Learn from user feedback to continuously improve the ML model.

**Features**:
- **Feedback Loop**:
  1. Crawler discovers organization → ML scores it
  2. User approves/rejects → Feedback stored
  3. Model retrains on new feedback → Improved predictions
  4. Next crawl uses improved model → Better results

- **Uncertainty Sampling**:
  - Prioritize organizations where model is uncertain (scores 5-7)
  - These are most valuable for learning
  - User feedback on uncertain cases improves model fastest

- **Batch Learning**:
  - After each crawl session, retrain model with all accumulated feedback
  - Use incremental learning to avoid full retraining
  - Track model performance metrics (precision, recall, F1-score)

**Implementation**:
```javascript
class ActiveLearningModule {
  constructor() {
    this.feedbackStore = new FeedbackStore(); // Google Sheets or database
    this.modelTrainer = new ModelTrainer();
  }

  async recordFeedback(organization, mlScore, userDecision) {
    await this.feedbackStore.save({
      organization: organization,
      mlScore: mlScore,
      userDecision: userDecision, // 'approved' | 'rejected'
      timestamp: new Date(),
      features: this.extractFeatures(organization)
    });
  }

  async retrainModel() {
    const feedback = await this.feedbackStore.getAll();
    const trainingData = feedback.map(f => ({
      features: f.features,
      label: f.userDecision === 'approved' ? 1 : 0
    }));
    
    await this.modelTrainer.train(trainingData);
    const metrics = await this.modelTrainer.evaluate();
    console.log(`Model retrained. Precision: ${metrics.precision}, Recall: ${metrics.recall}`);
  }

  async getUncertainOrganizations(organizations) {
    // Return organizations where model is uncertain (scores 5-7)
    return organizations.filter(org => {
      const score = org.mlScore;
      return score >= 5 && score <= 7;
    });
  }
}
```

### 2.3 Reinforcement Learning Agent

**Purpose**: Optimize crawling strategy by learning which sources and search patterns yield highest-quality results.

**Features**:
- **State Space**: Current crawl context (arrondissement, sources tried, entities found, quality scores)
- **Action Space**: Which source to try next, which search query to use, which extraction method
- **Reward Function**: Quality score of discovered organizations (weighted by user approval rate)
- **Policy**: Epsilon-greedy (explore new strategies 10% of time, exploit best strategies 90%)

**Learning Process**:
1. **Episode**: One crawl session (8 hours)
2. **Actions**: Choose next source/query/extraction method
3. **Rewards**: Quality scores of discovered organizations
4. **Update**: Q-learning or Policy Gradient to improve strategy

**Implementation**:
```javascript
class RLCrawlerAgent {
  constructor() {
    this.qTable = new Map(); // State-action value table
    this.epsilon = 0.1; // 10% exploration
    this.learningRate = 0.1;
    this.discountFactor = 0.9;
    this.provenStrategies = ['mairie', 'localityFirst', 'intelligent', 'advanced'];
  }

  async chooseAction(state) {
    // Epsilon-greedy: explore 10%, exploit 90%
    if (Math.random() < this.epsilon) {
      return this.explore(state); // Try new strategy
    } else {
      return this.exploit(state); // Use best known strategy
    }
  }

  async updateQValue(state, action, reward, nextState) {
    const currentQ = this.qTable.get(`${state}-${action}`) || 0;
    const maxNextQ = this.getMaxQValue(nextState);
    const newQ = currentQ + this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ);
    this.qTable.set(`${state}-${action}`, newQ);
  }

  async exploit(state) {
    // Use proven strategies with highest Q-values
    const bestAction = this.getBestAction(state);
    return bestAction || this.provenStrategies[0]; // Fallback to mairie crawler
  }

  async explore(state) {
    // Try new search queries, new sources, new extraction methods
    return this.generateNovelStrategy(state);
  }
}
```

### 2.4 Proven Strategy Integrator

**Purpose**: Leverage existing successful crawler modules as base strategies.

**Integration**:
- **LocalityFirstCrawler**: High precision, municipal sources (keep as primary)
- **Mairie Crawler**: Proven to work, high success rate (keep as fallback)
- **IntelligentCrawler**: Broad coverage, seed sources (use for discovery)
- **AdvancedCrawler**: Playwright-based, JS-heavy sites (use for complex pages)

**Strategy Selection**:
- RL agent chooses which strategy to use based on context
- Each strategy reports quality metrics
- Best-performing strategies get higher priority

**Implementation**:
```javascript
class ProvenStrategyIntegrator {
  constructor() {
    this.strategies = {
      localityFirst: new LocalityFirstCrawler(),
      mairie: new MairieCrawler(),
      intelligent: new IntelligentCrawler(),
      advanced: new AdvancedCrawler()
    };
    this.strategyPerformance = new Map(); // Track success rates
  }

  async executeStrategy(strategyName, context) {
    const strategy = this.strategies[strategyName];
    const startTime = Date.now();
    
    try {
      const results = await strategy.crawl(context);
      const qualityScores = await this.scoreResults(results);
      const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
      
      // Update performance tracking
      this.strategyPerformance.set(strategyName, {
        avgQuality: avgQuality,
        entitiesFound: results.length,
        successRate: results.filter(r => r.mlScore >= 7).length / results.length,
        executionTime: Date.now() - startTime
      });
      
      return results;
    } catch (error) {
      console.error(`Strategy ${strategyName} failed:`, error);
      return [];
    }
  }

  getBestStrategy(context) {
    // Return strategy with highest average quality for similar contexts
    const sorted = Array.from(this.strategyPerformance.entries())
      .sort((a, b) => b[1].avgQuality - a[1].avgQuality);
    return sorted[0]?.[0] || 'mairie'; // Fallback to proven mairie crawler
  }
}
```

### 2.5 Iterative Refinement Engine

**Purpose**: Self-improve by analyzing patterns in successful vs. failed discoveries.

**Features**:
- **Pattern Analysis**:
  - What do approved organizations have in common?
  - What patterns indicate rejected organizations?
  - Which sources yield highest-quality results?
  - Which search queries are most effective?

- **Automatic Rule Generation**:
  - Extract rules from approved examples
  - Generate filters to exclude rejected patterns
  - Update keyword lists based on successful discoveries

- **Continuous Improvement**:
  - After each crawl, analyze results
  - Update feature weights in ML model
  - Refine search queries and extraction patterns
  - Adjust quality thresholds

**Implementation**:
```javascript
class IterativeRefinementEngine {
  constructor() {
    this.patternAnalyzer = new PatternAnalyzer();
    this.ruleGenerator = new RuleGenerator();
  }

  async analyzeCrawlResults(crawlResults, userFeedback) {
    const approved = crawlResults.filter(r => userFeedback[r.id] === 'approved');
    const rejected = crawlResults.filter(r => userFeedback[r.id] === 'rejected');
    
    // Analyze patterns
    const approvedPatterns = this.patternAnalyzer.extractPatterns(approved);
    const rejectedPatterns = this.patternAnalyzer.extractPatterns(rejected);
    
    // Generate rules
    const newRules = this.ruleGenerator.generateRules(approvedPatterns, rejectedPatterns);
    
    // Update crawler configuration
    await this.updateCrawlerConfig(newRules);
    
    return {
      approvedPatterns: approvedPatterns,
      rejectedPatterns: rejectedPatterns,
      newRules: newRules,
      improvementMetrics: this.calculateImprovement(approved, rejected)
    };
  }

  async updateCrawlerConfig(rules) {
    // Update keyword lists
    if (rules.newKeywords) {
      await this.updateKeywords(rules.newKeywords);
    }
    
    // Update filters
    if (rules.newFilters) {
      await this.updateFilters(rules.newFilters);
    }
    
    // Update ML model weights
    if (rules.featureWeights) {
      await this.updateModelWeights(rules.featureWeights);
    }
  }
}
```

### 2.6 Quality Database

**Purpose**: Store training data, feedback, and quality metrics for continuous learning.

**Schema**:
- **Organizations Table**: All discovered organizations with ML scores
- **Feedback Table**: User approve/reject decisions
- **Training Data Table**: Features + labels for ML model
- **Strategy Performance Table**: Success rates per strategy
- **Pattern Rules Table**: Learned patterns and rules
- **Quality Metrics Table**: Precision, recall, F1-score over time

**Storage**: Google Sheets (current) or PostgreSQL (future upgrade)

---

## 3. Crawling Workflow (8-Hour Session)

### Phase 1: Initialization (5 minutes)
1. Load ML model (or initialize if first run)
2. Load proven strategies
3. Load RL agent state
4. Load quality database
5. Initialize priority queue

### Phase 2: Discovery Phase (2 hours)
1. **Seed Sources**: Use IntelligentCrawler to gather initial URLs
2. **Priority Queue**: RL agent selects best sources to crawl
3. **Parallel Crawling**: Use multiple strategies simultaneously
4. **Quality Scoring**: ML model scores each discovered organization
5. **Filtering**: Only keep organizations with score >= 7

### Phase 3: Deep Dive Phase (4 hours)
1. **High-Quality Sources**: Focus on sources that yielded high scores
2. **Graph Expansion**: Follow links from approved organizations
3. **Cross-Referencing**: Validate against official registries
4. **Enrichment**: Fill missing data from multiple sources
5. **Iterative Refinement**: Update strategies based on results

### Phase 4: Validation Phase (1.5 hours)
1. **Deduplication**: Remove duplicates using advanced similarity
2. **Final Scoring**: Re-score all organizations with updated model
3. **Quality Check**: Verify data completeness and accuracy
4. **User Review Queue**: Prepare uncertain cases (scores 5-7) for review

### Phase 5: Learning Phase (30 minutes)
1. **Feedback Integration**: Incorporate user feedback from previous sessions
2. **Model Retraining**: Update ML model with new training data
3. **RL Agent Update**: Update Q-values based on rewards
4. **Pattern Analysis**: Extract new patterns and rules
5. **Strategy Optimization**: Adjust strategy priorities

---

## 4. Quality Metrics & Evaluation

### 4.1 Metrics Tracked

- **Precision**: % of approved organizations / total discovered
- **Recall**: % of relevant organizations found / total relevant in arrondissement
- **F1-Score**: Harmonic mean of precision and recall
- **Average Quality Score**: Mean ML score of discovered organizations
- **Source Effectiveness**: Quality scores per source type
- **Strategy Performance**: Success rates per strategy
- **Learning Curve**: Improvement in metrics over time

### 4.2 Evaluation Process

1. **After Each Crawl**:
   - Calculate metrics on discovered organizations
   - Compare to previous crawls
   - Identify improvements/regressions

2. **After User Feedback**:
   - Update training data
   - Retrain model
   - Recalculate metrics on test set

3. **Weekly Review**:
   - Analyze trends in quality metrics
   - Identify best-performing strategies
   - Adjust crawler configuration

---

## 5. Technology Stack

### 5.1 Machine Learning (Local Execution)

**✅ YES, ML can run locally on your computer!**

Two approaches:

#### Option 1: TensorFlow.js (Recommended - Pure Node.js)
- **Framework**: TensorFlow.js (runs directly in Node.js)
- **Pros**: 
  - No Python dependency
  - Runs in same process as crawler
  - Good performance for small-medium models
  - Easy to deploy and maintain
- **Cons**: 
  - Slightly slower than Python for training
  - Limited model types compared to scikit-learn
- **Performance**: 
  - Inference: ~1-5ms per organization (very fast)
  - Training: ~5-30 minutes for 132 activities (acceptable for overnight runs)
- **Hardware**: Works on any modern Mac/PC (CPU-based, no GPU required)

#### Option 2: Python Bridge (More Powerful)
- **Framework**: scikit-learn (Random Forest, Gradient Boosting) via child process
- **Pros**: 
  - More ML algorithms available
  - Better for complex models
  - Industry standard
- **Cons**: 
  - Requires Python installation
  - Inter-process communication overhead
- **Performance**: 
  - Inference: ~10-50ms per organization (still fast)
  - Training: ~2-10 minutes for 132 activities
- **Hardware**: Works on any modern Mac/PC

**Recommendation**: Start with **TensorFlow.js** (Option 1) for simplicity. Can switch to Python bridge if needed.

### 5.2 Active Learning
- **Uncertainty Sampling**: Implement custom algorithm
- **Batch Learning**: Incremental model updates
- **Feedback Storage**: Google Sheets or PostgreSQL

### 5.3 Reinforcement Learning
- **Algorithm**: Q-Learning or Deep Q-Network (DQN)
- **State Representation**: Feature vectors
- **Reward Function**: Quality-based rewards

### 5.4 Existing Modules (Reused)
- LocalityFirstCrawler
- IntelligentCrawler
- AdvancedCrawler
- Mairie Crawler
- ValidationModule
- EnrichmentModule

---

## 6. Pros and Cons

### 6.1 Pros

✅ **High Accuracy**: ML model learns from feedback, improving over time
✅ **Self-Improving**: System gets better with each crawl session
✅ **Quality-Focused**: Prioritizes precision over recall
✅ **Adaptive**: Adjusts strategy based on what works
✅ **Leverages Existing Work**: Reuses proven crawler modules
✅ **Scalable Learning**: Can handle increasing amounts of training data
✅ **Uncertainty Handling**: Identifies cases needing human review
✅ **Comprehensive**: Combines multiple strategies intelligently

### 6.2 Cons

❌ **Initial Setup Complexity**: Requires ML infrastructure and training data
❌ **Cold Start Problem**: Needs initial feedback to train model (bootstrap with existing 132 activities)
❌ **Computational Overhead**: ML inference adds latency (acceptable for 8-hour runs)
❌ **Model Maintenance**: Requires monitoring and retraining
❌ **Potential Overfitting**: Risk of overfitting to training data
❌ **Feedback Dependency**: Quality depends on user feedback quality
❌ **Black Box Concerns**: ML model decisions may be hard to interpret (mitigated by feature breakdown)

### 6.3 Mitigation Strategies

- **Cold Start**: Use existing 132 activities as initial training data
- **Overfitting**: Use cross-validation, regularization, and diverse training data
- **Interpretability**: Provide feature breakdowns and explanations for scores
- **Feedback Quality**: Implement feedback validation and outlier detection

---

## 7. Why Accuracy Will Improve

### 7.1 Learning from Feedback
- **Initial State**: Model trained on existing 132 activities (ground truth)
- **After First Crawl**: User feedback on discovered organizations → model learns patterns
- **After Second Crawl**: Model uses learned patterns → better predictions
- **Iterative Improvement**: Each cycle improves accuracy

### 7.2 Pattern Recognition
- **Approved Organizations**: Model learns what makes an organization relevant
  - Keywords: "enfant", "jeune", "sport", "activité"
  - Source types: Municipal sites, official registries
  - Data completeness: Email + phone + website
  - Geographic indicators: Arrondissement mentions, Paris addresses

- **Rejected Organizations**: Model learns what to avoid
  - Generic nonprofits without activities
  - Adult-only organizations
  - Newsletters and information pages
  - Organizations outside target area

### 7.3 Strategy Optimization
- **RL Agent**: Learns which sources/queries yield highest quality
- **Proven Strategies**: Best-performing strategies get higher priority
- **Adaptive Selection**: Chooses strategy based on context

### 7.4 Continuous Refinement
- **Rule Generation**: Automatically extracts rules from patterns
- **Feature Weighting**: Adjusts importance of different features
- **Threshold Tuning**: Optimizes quality score thresholds

### 7.5 Expected Improvement Timeline

- **Week 1**: Baseline (existing 132 activities as training data)
- **Week 2**: +10% precision after first feedback cycle
- **Week 3**: +20% precision, better source selection
- **Week 4+**: +30-40% precision, optimized strategies

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1)
- Set up ML infrastructure (TensorFlow.js for local execution)
- **Load existing 132 activities** with ALL fields as training data
- **Extract rich features** from all available fields (text, contact, geographic, age, pricing, availability)
- Implement basic ML Quality Scorer (rule-based + simple ML)
- Train initial model on 132 activities (all labeled as "approved")
- Integrate with existing crawler modules
- Set up quality database (Google Sheets)

### Phase 2: Active Learning (Week 2)
- Implement feedback loop
- Set up model retraining pipeline
- Implement uncertainty sampling
- Track learning metrics

### Phase 3: Reinforcement Learning (Week 3)
- Implement RL agent
- Set up reward function
- Integrate with strategy selection
- Track strategy performance

### Phase 4: Iterative Refinement (Week 4)
- Implement pattern analysis
- Set up rule generation
- Implement automatic configuration updates
- Full integration testing

### Phase 5: Optimization (Ongoing)
- Fine-tune hyperparameters
- Optimize model architecture
- Improve feature engineering
- Continuous monitoring and improvement

---

## 9. Success Criteria

### 9.1 Quality Metrics
- **Precision**: >85% (85% of discovered organizations are approved)
- **Recall**: >70% (70% of relevant organizations in arrondissement are found)
- **F1-Score**: >75%
- **Average Quality Score**: >7.5/10

### 9.2 Learning Metrics
- **Model Accuracy**: >80% on test set
- **Improvement Rate**: +5% precision per week (first month)
- **Strategy Optimization**: Best strategy identified and prioritized

### 9.3 Operational Metrics
- **Crawl Duration**: 6-8 hours (within target)
- **Organizations Found**: 50-100 per arrondissement (quality over quantity)
- **False Positive Rate**: <15%

---

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| ML model fails to learn | High | Start with rule-based model, gradual ML transition |
| Overfitting to training data | Medium | Cross-validation, regularization, diverse data |
| Cold start problem | Medium | Use existing 132 activities as bootstrap |
| Computational overhead | Low | Acceptable for 8-hour runs, optimize later |
| Feedback quality issues | Medium | Validate feedback, detect outliers |
| Model interpretability | Low | Provide feature breakdowns, explanations |

---

## 11. Next Steps

1. **Review and Approval**: Get stakeholder approval on design
2. **Technology Selection**: Finalize ML framework (scikit-learn vs TensorFlow.js)
3. **Data Preparation**: Prepare training data from existing 132 activities
4. **Prototype Development**: Build Phase 1 (Foundation)
5. **Testing**: Test on 20e arrondissement with existing data
6. **Iterative Development**: Build remaining phases incrementally

---

## 12. References

- Reinforcement Learning for Focused Crawling: https://arxiv.org/abs/2112.07620
- Active Learning for Entity Extraction: Various papers on uncertainty sampling
- Scrapy Best Practices: https://docs.scrapy.org/en/latest/topics/practices.html
- Apache Nutch Architecture: https://nutch.apache.org/
- StormCrawler: https://stormcrawler.apache.org/

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-05  
**Author**: AI Assistant  
**Status**: Draft for Review

