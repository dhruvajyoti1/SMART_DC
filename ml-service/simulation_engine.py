"""
Drives the Live Operations Dashboard by replaying held-out test data in
chronological order, one tick at a time -- Option B, confirmed with the
user: pre-cleaned replay, not live causal cleaning.

Design note: forecast_test_data and anomaly_test_data come from DIFFERENT
splits (chronological vs. stratified-random -- see Notebook 6's walkthrough
for why). This engine only ticks over timestamps present in BOTH, using the
exact same intersection approach already proven in Notebook 8, so every
tick has genuine ground truth for both forecast and anomaly branches
together -- never fabricated or interpolated.
"""
import joblib
import model_loader as ml


class SimulationEngine:
    def __init__(self):
        X_test_f = ml.forecast_test_data["X_test"]
        X_test_a = ml.anomaly_test_data["X_test"]

        common_idx = X_test_f.index.intersection(X_test_a.index).sort_values()
        if len(common_idx) == 0:
            raise RuntimeError(
                "No overlapping timestamps between forecast and anomaly test sets. "
                "anomaly_test_data.pkl likely lacks a datetime index — "
                "re-run 06_anomaly_models.ipynb."
            )

        self.timestamps = common_idx
        self.X_test_f = X_test_f
        self.X_test_a = X_test_a
        self.position = 0

    @property
    def total_ticks(self) -> int:
        return len(self.timestamps)

    @property
    def is_exhausted(self) -> bool:
        return self.position >= self.total_ticks

    @property
    def current_timestamp(self):
        if self.is_exhausted:
            return None
        return self.timestamps[self.position]

    def reset(self):
        self.position = 0

    def get_current_features(self):
        """Returns (forecast_features_dict, anomaly_features_dict, timestamp) for the current tick."""
        if self.is_exhausted:
            return None
        ts = self.timestamps[self.position]
        forecast_features = self.X_test_f.loc[ts].to_dict()
        anomaly_features = self.X_test_a.loc[ts].to_dict()
        return forecast_features, anomaly_features, ts

    def advance(self):
        """Moves to the next tick. Returns False if already exhausted."""
        if self.is_exhausted:
            return False
        self.position += 1
        return True


# Module-level singleton -- one shared simulation state for the whole service,
# same principle as model_loader's singleton models.
simulation = SimulationEngine()
