from pathlib import Path
from fastapi import FastAPI
from pydantic import BaseModel , field_validator , Field
import joblib 
from fastapi.responses import FileResponse
import numpy as np
from typing import Literal
import pandas as pd
from datetime import date as dt_date
from tensorflow import keras
BASE = Path("/Users/hemantbisht/Documents/sale/store-sales-time-series-forecasting/Sales.ipynb").parent
all_cols= joblib.load('features_cols.joblib')
model = keras.models.load_model(BASE/'sales_ann.keras')
pre = joblib.load(BASE/ 'preprocessor.joblib')

stores = pd.read_csv("stores.csv")
holiday = pd.read_csv("holidays_events.csv",parse_dates=["date"])
holiday = holiday[holiday["transferred"]==False]

def flag(col,val,name):
    return (holiday[holiday[col]==val][["date"]].drop_duplicates().assign(**{name:1}))

flag_tables=[flag("type","Bridge","is_bridge"),
            flag("type","Transfer","is_transfer"),
            flag("type","Additional","is_additional"),
            flag("type","Holiday","is_holiday"),
            flag("locale","Regional","is_regional"),
            flag("locale","Local","is_local"),
            flag("locale","National","is_national"),
            flag("type","Work Day","is_workday"),
            flag("type","Event","is_event")
            ]

def make_features(df):
    df["date"]= pd.to_datetime(df["date"])
    
    df = df.merge(stores , on ="store_nbr",how="left")
    for i in flag_tables:
        df = df.merge(i, on="date" , how="left")
    flag_cols = [c for c in df.columns if c.startswith("is_")]
    df[flag_cols]=df[flag_cols].fillna(0).astype(int)
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["dayofweek"] = df["date"].dt.dayofweek
    df["is_15th"] = (df["date"].dt.day == 15).astype(int)
    df["is_month_end"] = df["date"].dt.is_month_end.astype(int)
    df["is_earthquake"]=((df['date']>='2016-04-16') & (df['date']<='2016-05-16')).astype(int)
    return df[all_cols]






app= FastAPI()



class inp(BaseModel):
    date : str =Field(example="2013-11-03")
    store_nbr : int = Field(example="5")
    family : Literal['AUTOMOTIVE','BABY CARE','BEAUTY','BEVERAGES','BOOKS','BREAD/BAKERY','CELEBRATION', 'CLEANING','DAIRY','DELI','EGGS','FROZEN FOODS','GROCERY I','GROCERY II','HARDWARE','HOME AND KITCHEN I','HOME AND KITCHEN II', 'HOME APPLIANCES','HOME CARE','LADIESWEAR','LAWN AND GARDEN','LINGERIE','LIQUOR,WINE,BEER','MAGAZINES','MEATS','PERSONAL CARE','PET SUPPLIES','PLAYERS AND ELECTRONICS','POULTRY','PREPARED FOODS','PRODUCE', 'SCHOOL AND OFFICE SUPPLIES','SEAFOOD']
    onpromotion : int = Field(ge=0,le=750)
    transactions : int = Field(ge=0,le=8500)

    @field_validator('store_nbr')
    @classmethod
    def valid_store(cls, store):
        if not 1 <= store <= 54:
            raise ValueError("Store number should be between 1 to 54")
        return store

    @field_validator('date')
    @classmethod
    def valid_date(cls, v):
        try:
            d = dt_date.fromisoformat(v)      # "YYYY-MM-DD" format check
        except ValueError:
            raise ValueError('Date format should be in YYYY-MM-DD')
        return v

@app.post('/predict')
def predict(x : inp):
    df = make_features(pd.DataFrame([x.model_dump()]))
    pred = model.predict(pre.transform(df), verbose=0).flatten()[0]
    return {"sales": float(np.expm1(max(pred,0)))}



@app.get("/")
def home():
    return FileResponse("index.html")

@app.get("/style.css")
def styles():
    return FileResponse("style.css")

@app.get("/script.js")
def scripts():
    return FileResponse("script.js")
