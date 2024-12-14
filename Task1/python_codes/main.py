from dotenv import load_dotenv
import pandas as pd
from llama_index.experimental.query_engine import PandasQueryEngine
from llama_index.core import PromptTemplate
from llama_index.core.llms import ChatMessage
from pprint import pprint
import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from dotenv import load_dotenv, find_dotenv


app = Flask(__name__)
CORS(app, resources={r"/query": {"origins": "http://localhost:5500"}})

load_dotenv(find_dotenv())
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')


data_path = "../data/CommercialTrans_201910 to 202410.csv"
df = pd.read_csv(data_path)
query_engine = PandasQueryEngine(df=df, verbose=True)


@app.route('/query', methods=['POST'])
def handle_query():
    try:
        data = request.json
        query_str = data.get('query', '')

        if not query_str:
            return jsonify({"error": "Query string is required."}), 400

        response = query_engine.query(query_str)

        return jsonify({"query": query_str, "result": response.response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


app.run(debug=True, port='5000')
