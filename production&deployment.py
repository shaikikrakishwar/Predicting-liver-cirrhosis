from flask import Flask, request, jsonify
import joblib

app = Flask(_name_)
model = joblib.load('best_cirrhosis_model.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json['data']
    df_in = pd.DataFrame([data])
    df_in[num_cols] = SimpleImputer(strategy='median').fit_transform(df_in[num_cols])
    pred = model.predict(df_in[X_train.columns])
    return jsonify({'stage': int(pred[0])})

if _name_ == "_main_":
    app.run(debug=True)
