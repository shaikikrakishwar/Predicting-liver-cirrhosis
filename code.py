import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE
from sklearn.metrics import classification_report, roc_auc_score

# Optional: Using TabPFN
try:
    from tabpfn import TabPFNClassifier
    USE_TABPFN = True
except ImportError:
    USE_TABPFN = False

# 1. Load dataset
df = pd.read_csv('path_to/pbc_dataset.csv')  # Or your chosen dataset

# 2. Preprocessing
# Impute numeric missing values
num_cols = df.select_dtypes(include=[np.number]).columns
df[num_cols] = SimpleImputer(strategy='median').fit_transform(df[num_cols])

# Encode categorical targets (e.g., stages A/B/C or binary disease)
if df['stage'].dtype == object:
    le_target = LabelEncoder()
    df['stage'] = le_target.fit_transform(df['stage'])

# 3. EDA
sns.countplot(x='stage', data=df)
plt.title('Stage Class Distribution')
plt.show()
print(df.describe())  

# 4. Prepare features and labels
X = df.drop(columns=['stage', 'patient_id'])  # drop irreversible columns
y = df['stage']

# Handle imbalance (for multi-class or binary)
smote = SMOTE(random_state=42)
X_res, y_res = smote.fit_resample(X, y)

# 5. Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X_res, y_res,
    test_size=0.2, stratify=y_res, random_state=42)

# 6. Model Pipelines
models = {
    "Random Forest": RandomForestClassifier(n_estimators=200, random_state=42),
    "XGBoost": XGBClassifier(use_label_encoder=False, eval_metric='mlogloss', random_state=42),
}

if USE_TABPFN:
    models["TabPFN"] = TabPFNClassifier(N_ensemble_configurations=32, seed=42)

results = {}
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

for name, model in models.items():
    scores = cross_val_score(model, X_train, y_train, cv=skf,
                             scoring='accuracy', n_jobs=-1)
    results[name] = scores
    print(f"{name:<12} CV Accuracy: {scores.mean():.3f} ± {scores.std():.3f}")

# 7. Train best model on full training data
best_model_name = max(results, key=lambda k: results[k].mean())
best_model = models[best_model_name]
best_model.fit(X_train, y_train)

# 8. Evaluation
y_pred = best_model.predict(X_test)
print(f"\nEvaluating best: {best_model_name}")
print(classification_report(y_test, y_pred))
if hasattr(best_model, "predict_proba"):
    y_proba = best_model.predict_proba(X_test)
    if y_proba.shape[1] == 2:
        auc = roc_auc_score(y_test, y_proba[:,1])
        print(f"ROC AUC: {auc:.3f}")

# 9. Feature Importance Visualization
if hasattr(best_model, "feature_importances_"):
    feat_imp = pd.Series(best_model.feature_importances_, index=X.columns)
    feat_imp.sort_values(ascending=False).head(10).plot.barh()
    plt.title("Top 10 Feature Importances")
    plt.show()
