# Shelf forecast: store sales prediction, end to end

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-Keras%203-FF6F00?logo=tensorflow&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-API-009688?logo=fastapi&logoColor=white)
![Render](https://img.shields.io/badge/deployed%20on-Render-46E3B7?logo=render&logoColor=white)

A neural network that estimates how many units a store sells in a product family on a given day, served by FastAPI with a small web app on top. Built on the Kaggle competition [Store Sales: Time Series Forecasting](https://www.kaggle.com/competitions/store-sales-time-series-forecasting) (Corporación Favorita, Ecuador).

**Live demo: https://store-sales-time-series-deep-learning.onrender.com/**

<!-- Add a screenshot of the app here:
![Shelf forecast app](docs/screenshot.png)
-->

Pick a date, a store, a product family, the number of items on promotion and the day's transactions. The app prints the predicted units sold on a receipt. The example buttons at the top of the form fill in realistic inputs.

If the service runs on Render's free plan, it sleeps when idle and the first request can take about a minute to wake it up.

## Results

| Metric | Value |
|---|---|
| Validation RMSLE | **0.42** |
| Validation window | Last 16 days of the training data (31 Jul to 15 Aug 2017) |

The model uses same-day `transactions` as an input, and the Kaggle `test.csv` does not have that column. So 0.42 is not comparable with the competition leaderboard. It shows how well the model estimates a day's sales when that day's transactions are known (a nowcast), not how well it forecasts a future day.

## How it works

```
user input (date, store, family, promotion, transactions)
   │
   ▼
make_features()   store info, holiday and event flags, date, payday and earthquake flags
   │
   ▼
preprocessor      log1p + MinMax, one-hot encoding, MinMax
   │
   ▼
Keras ANN         predicts log1p(sales), converted back with expm1
```

The ANN has three hidden layers (128, 64, 32) with ReLU and is trained on `log1p(sales)`. Data cleaning, feature building and training steps are written up in the project notes: `<notes-link>`.

## Project structure

```
.
├── Sales.ipynb            EDA, features, training, saving artifacts
├── fast.py                FastAPI app (make_features, /predict, serves index.html)
├── index.html             Web app
├── preprocessor.joblib    Fitted preprocessing pipeline
├── features_cols.joblib   Column order used at training time
├── sales_ann.keras        Trained model
├── stores.csv             Needed to run the API
├── holidays_events.csv    Needed to run the API
└── requirements.txt
```

## Deploy on Render

| Setting | Value |
|---|---|
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn fast:app --host 0.0.0.0 --port $PORT` |
| Environment variable | `PYTHON_VERSION=3.11.18` |

## API

The response has the shape `{"sales": <float>}`, the predicted units sold.

| Field | Rule |
|---|---|
| `date` | `YYYY-MM-DD`, from 2013-01-01 to 2017-08-15 |
| `store_nbr` | Integer from 1 to 54 |
| `family` | One of the 33 product families, for example `GROCERY I`, `BEVERAGES`, `DAIRY` |
| `onpromotion` | Integer from 0 to 750 |
| `transactions` | Integer from 0 to 8500 (0 for a closed store) |

Invalid input returns `422` with the field name and the reason.

## Limitations

- It is a nowcast, not a forecast. Predicting future days needs lag features, because tomorrow's transactions are not known yet.
- Dates are limited to the training range (2013-01-01 to 2017-08-15).
- Local and regional holiday flags are matched by date only, so they apply to all 54 stores.
- The earthquake window (16 Apr to 16 May 2016) is an assumption.

## And I'll provide(Attached) my personal digital notes about Data Preprocessing , EDA and all stufff
- Notes Link --> https://drive.google.com/file/d/1L78z-hTVKSDA4ixztdsy2xcdZpComtLp/view?usp=drive_link
