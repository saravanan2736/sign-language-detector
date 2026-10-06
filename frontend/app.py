import streamlit as st
import requests

# Constants
BACKEND_URL = "http://localhost:8000"

st.set_page_config(page_title="Sign Language Detector", layout="centered")

st.title("Sign Language Detector")
st.write("Upload a video clip of an American Sign Language (ASL) sign, and the multi-stream neural network will predict the word.")

# File Uploader
uploaded_file = st.file_uploader("Upload an isolated sign video", type=["mp4", "avi", "mov", "webm"])

if uploaded_file is not None:
    st.video(uploaded_file)
    
    if st.button("Predict Sign"):
        with st.spinner("Processing video and extracting features..."):
            try:
                # Send video to FastAPI backend
                files = {"video": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
                response = requests.post(f"{BACKEND_URL}/predict", files=files)
                
                if response.status_code == 200:
                    result = response.json()
                    st.success(f"**Predicted Word:** {result.get('predicted_word', 'Unknown').upper()}")
                    st.info(f"Confidence Score: {result.get('score', 0):.2f}")
                    st.caption(f"Model Version: {result.get('model_version', 'N/A')}")
                else:
                    st.error(f"Error from backend: {response.status_code} - {response.text}")
            except requests.exceptions.ConnectionError:
                st.error("Could not connect to the backend service. Ensure the FastAPI server is running.")
            except Exception as e:
                st.error(f"An error occurred: {str(e)}")

st.divider()
st.subheader("Webcam Recording (Coming Soon)")
st.write("Future support for direct webcam capture using streamlit-webrtc or similar.")
