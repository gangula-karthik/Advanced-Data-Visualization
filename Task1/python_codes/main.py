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


instruction_str = """\
1. Convert the query to executable Python code using Pandas.
2. The final line of code should be a Python expression that can be called with the `eval()` function.
3. The code should represent a solution to the query.
4. PRINT ONLY THE EXPRESSION.
5. Do not quote the expression.
"""

new_prompt = PromptTemplate(
    """\
        You are working with a pandas dataframe in Python.
        The name of the dataframe is `df`.
        This is the result of `print(df.head())`:
        {df_str}

        Follow these instructions:
        {instruction_str}
        Query: {query_str}

        Expression: 
    """
)

query_engine.update_prompts({"pandas_prompt": new_prompt})


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
