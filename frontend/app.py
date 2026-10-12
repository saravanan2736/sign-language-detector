import streamlit as st
import requests
import cv2
import tempfile
import torch

# Constants
BACKEND_URL = "http://localhost:8000"

st.set_page_config(page_title="Sign Language Detector", layout="wide")

# --- Sidebar Configuration ---
st.sidebar.header("Model / Device")
gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A"
st.sidebar.write(f"**Model:** ST-GCN Fast AI")
st.sidebar.write(f"**Device:** {'CUDA' if torch.cuda.is_available() else 'CPU'}")
st.sidebar.write(f"**GPU:** {gpu_name}")
if torch.cuda.is_available():
    mem = torch.cuda.get_device_properties(0).total_memory / 1024**3
    st.sidebar.write(f"**GPU memory:** {mem:.1f} GB")

st.sidebar.header("Instructions")
st.sidebar.markdown(
    "1. For Video Uploads: Use this web app.\n"
    "2. For Live Webcam Demo: Use the native `live_camera.py` script for zero lag!"
)

# --- Main UI ---
st.title("WLASL-100 ASL Recognition")
st.write("Upload an ASL video clip, and the AI will predict the sign.")

col1, col2 = st.columns([3, 2])

with col1:
    uploaded_file = st.file_uploader("Upload an isolated sign video", type=["mp4", "avi", "mov", "webm"])
    if uploaded_file is not None:
        st.video(uploaded_file)

with col2:
    if uploaded_file is not None:
        if st.button("Predict Sign", use_container_width=True):
            with st.spinner("Processing video and extracting features..."):
                try:
                    files = {"video": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
                    response = requests.post(f"{BACKEND_URL}/predict", files=files)
                    
                    if response.status_code == 200:
                        result = response.json()
                        st.success("Prediction Complete!")
                        st.markdown(f"### Predicted Word: **{result.get('predicted_word', 'Unknown').upper()}**")
                        st.progress(min(result.get('score', 0), 1.0))
                        st.write(f"Confidence Score: {result.get('score', 0) * 100:.1f}%")
                        st.markdown("**Top 5 predictions**")
                        for item in result.get("top5", []):
                            st.write(f"{item['word'].upper()} - {item['score'] * 100:.1f}%")
                            st.progress(min(item["score"], 1.0))
                    else:
                        detail = response.json().get("detail", response.status_code)
                        st.error(f"Error from backend: {detail}")
                except Exception as e:
                    st.error("Could not connect to backend. Make sure FastAPI is running!")

st.divider()
st.subheader("⚠️ For Live Webcam Demonstration")
st.info("Streamlit is known to severely lag when forcing live video through a web browser. To show off a perfectly smooth, zero-lag Real-Time Demo to your professors, run the native camera script!")
st.code("python live_camera.py", language="powershell")
