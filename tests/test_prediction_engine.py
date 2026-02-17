from tests.conftest import load_module_from_path


def _load_prediction_module():
    return load_module_from_path(
        "prediction_main_test",
        "services/prediction/main.py",
        env={"DATABASE_URL": "sqlite:///:memory:"},
    )


def test_dummy_model_mortality_risk_response_shape() -> None:
    module = _load_prediction_module()
    model = module.DummyMLModel("mortality_risk")

    prediction, confidence = model.predict({"age": 60, "severity_score": 8})

    assert "risk_score" in prediction
    assert prediction["risk_level"] in {"low", "medium", "high"}
    assert 0 <= confidence <= 1


def test_dummy_model_length_of_stay_prediction() -> None:
    module = _load_prediction_module()
    model = module.DummyMLModel("length_of_stay")

    prediction, confidence = model.predict({"age": 40, "severity_score": 6})

    assert prediction["predicted_days"] == 14
    assert confidence == 0.78


def test_dummy_model_unknown_model_fallback() -> None:
    module = _load_prediction_module()
    model = module.DummyMLModel("unknown_model")

    prediction, confidence = model.predict({})

    assert prediction == {"result": "unknown_model"}
    assert confidence == 0.0
