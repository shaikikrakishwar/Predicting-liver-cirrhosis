import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc } from 'firebase/firestore'; // Import collection and addDoc

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const __initial_auth_token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const __app_id = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

function App() {
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [albumin, setAlbumin] = useState('');
  const [alkalinePhosphatase, setAlkalinePhosphatase] = useState('');
  const [alt, setAlt] = useState('');
  const [ast, setAst] = useState('');
  const [bilirubin, setBilirubin] = useState('');

  const [predictionResult, setPredictionResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState(''); // New state for save message

  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestoreDb);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          try {
            await signInAnonymously(firebaseAuth);
            setUserId(firebaseAuth.currentUser?.uid || 'anonymous');
          } catch (anonError) {
            console.error("Error signing in anonymously:", anonError);
            setError("Failed to authenticate. Some features may not work.");
          }
        }
        setIsAuthReady(true);
      });

      return () => unsubscribe();

    } catch (firebaseError) {
      console.error("Firebase initialization failed:", firebaseError);
      setError("Failed to initialize Firebase. Check console for details.");
    }
  }, []);

  const handlePredict = async () => {
    setError('');
    setSaveMessage(''); // Clear previous save messages
    setPredictionResult(null);

    if (!age || !albumin || !alkalinePhosphatase || !alt || !ast || !bilirubin) {
      setError('Please fill in all fields.');
      return;
    }

    const patientData = {
      age: parseInt(age),
      gender: gender,
      albumin: parseFloat(albumin),
      alkalinePhosphatase: parseFloat(alkalinePhosphatase),
      alt: parseFloat(alt),
      ast: parseFloat(ast),
      bilirubin: parseFloat(bilirubin),
    };

    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 2000));

    let riskScore = 0;
    if (patientData.age > 50) riskScore += 0.1;
    if (patientData.gender === 'female') riskScore += 0.05;
    if (patientData.albumin < 3.5) riskScore += 0.2;
    if (patientData.alkalinePhosphatase > 150) riskScore += 0.15;
    if (patientData.alt > 40 || patientData.ast > 40) riskScore += 0.25;
    if (patientData.bilirubin > 1.2) riskScore += 0.3;

    riskScore += (Math.random() - 0.5) * 0.1;
    riskScore = Math.max(0, Math.min(1, riskScore));

    let diagnosis = '';
    let confidence = 0;

    if (riskScore > 0.7) {
      diagnosis = 'High Risk of Cirrhosis';
      confidence = (70 + Math.random() * 30).toFixed(2);
    } else if (riskScore > 0.4) {
      diagnosis = 'Moderate Risk, Further Evaluation Recommended';
      confidence = (40 + Math.random() * 30).toFixed(2);
    } else {
      diagnosis = 'Low Risk of Cirrhosis';
      confidence = (70 + Math.random() * 30).toFixed(2);
    }

    const result = {
      diagnosis,
      riskScore: (riskScore * 100).toFixed(2),
      confidence: confidence,
      patientData: patientData,
      timestamp: new Date().toISOString(), // Add a timestamp
      userId: userId, // Store the user ID with the prediction
    };

    setPredictionResult(result);
    setIsLoading(false);

    // Save to Firestore after prediction
    if (isAuthReady && db && userId) {
      try {
        // Define the collection path based on whether it's public or private data
        // For private user data, use /artifacts/{appId}/users/{userId}/predictions
        const predictionsCollectionRef = collection(db, `artifacts/${__app_id}/users/${userId}/predictions`);
        await addDoc(predictionsCollectionRef, result);
        setSaveMessage('Prediction saved successfully!');
      } catch (saveError) {
        console.error("Error saving prediction to Firestore:", saveError);
        setError("Failed to save prediction. Check console for details.");
      }
    } else {
      console.warn("Firestore not ready or user not authenticated, skipping save.");
      setSaveMessage("Prediction not saved (authentication/Firestore not ready).");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 font-inter">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-blue-200">
        <h1 className="text-3xl font-extrabold text-center text-blue-800 mb-6">
          <span className="block text-indigo-600">Liver Cirrhosis</span> Prediction
        </h1>

        {isAuthReady && userId && (
          <div className="text-sm text-gray-600 text-center mb-4 p-2 bg-gray-50 rounded-lg border border-gray-200">
            Current User ID: <span className="font-mono text-gray-800 break-all">{userId}</span>
          </div>
        )}

        <p className="text-gray-600 text-center mb-8">
          Enter patient's clinical and laboratory data to get a simulated liver cirrhosis risk prediction.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="flex flex-col">
            <label htmlFor="age" className="text-sm font-medium text-gray-700 mb-1">Age</label>
            <input
              type="number"
              id="age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              placeholder="e.g., 45"
              min="1"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="gender" className="text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-white"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="albumin" className="text-sm font-medium text-gray-700 mb-1">Albumin (g/dL)</label>
            <input
              type="number"
              id="albumin"
              value={albumin}
              onChange={(e) => setAlbumin(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              placeholder="e.g., 3.8"
              step="0.1"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="alkalinePhosphatase" className="text-sm font-medium text-gray-700 mb-1">Alkaline Phosphatase (U/L)</label>
            <input
              type="number"
              id="alkalinePhosphatase"
              value={alkalinePhosphatase}
              onChange={(e) => setAlkalinePhosphatase(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              placeholder="e.g., 120"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="alt" className="text-sm font-medium text-gray-700 mb-1">ALT (U/L)</label>
            <input
              type="number"
              id="alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              placeholder="e.g., 35"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="ast" className="text-sm font-medium text-gray-700 mb-1">AST (U/L)</label>
            <input
              type="number"
              id="ast"
              value={ast}
              onChange={(e) => setAst(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              placeholder="e.g., 40"
            />
          </div>

          <div className="flex flex-col md:col-span-2">
            <label htmlFor="bilirubin" className="text-sm font-medium text-gray-700 mb-1">Bilirubin (mg/dL)</label>
            <input
              type="number"
              id="bilirubin"
              value={bilirubin}
              onChange={(e) => setBilirubin(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              placeholder="e.g., 0.9"
              step="0.1"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        <button
          onClick={handlePredict}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform transition duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Predicting...' : 'Predict Liver Cirrhosis'}
        </button>

        {predictionResult && (
          <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200 shadow-md">
            <h2 className="text-2xl font-bold text-blue-700 mb-4">Prediction Result</h2>
            <p className="text-lg text-gray-800 mb-2">
              <span className="font-semibold">Diagnosis:</span> {predictionResult.diagnosis}
            </p>
            <p className="text-lg text-gray-800 mb-2">
              <span className="font-semibold">Risk Score:</span> {predictionResult.riskScore}%
            </p>
            <p className="text-lg text-gray-800">
              <span className="font-semibold">Confidence:</span> {predictionResult.confidence}%
            </p>
            {saveMessage && (
              <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-lg text-sm">
                {saveMessage}
              </div>
            )}
            <div className="mt-4 text-sm text-gray-600">
              <p>
                <span className="font-semibold">Note:</span> This is a simulated prediction based on a simplified model and should not be used for actual medical diagnosis. Always consult a healthcare professional.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
