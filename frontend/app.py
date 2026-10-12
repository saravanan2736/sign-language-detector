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
    "1. **Upload video**: predict a sign from a recorded clip.\n"
    "2. **Live webcam**: real-time recognition in the browser "
    "(`python live_camera.py` is smoother)."
)

# --- Main UI ---
st.title("WLASL-100 ASL Recognition")
tab_upload, tab_live = st.tabs(["Upload video", "Live webcam"])

with tab_upload:
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


with tab_live:
    st.write("Allow camera access, press START, and sign in front of the camera. "
             "Predictions appear after ~64 frames (about 2 seconds).")
    try:
        import time
        from streamlit_webrtc import webrtc_streamer
        from live import LiveRecognizer, load_model

        model, device, vocab = load_model()
        recognizer = st.session_state.setdefault("recognizer", LiveRecognizer(model, device, vocab))
        # Keep the camera small so the predictions stay visible beside it
        st.markdown(
            "<style>div[data-testid='stVideo'] video, .stVideo video {max-height: 320px; width: 100%; object-fit: contain;}"
            " video {max-height: 320px;}</style>",
            unsafe_allow_html=True,
        )
        cam_col, pred_col = st.columns([2, 3])
        with cam_col:
            ctx = webrtc_streamer(
                key="live-asl",
                video_frame_callback=recognizer.callback,
                media_stream_constraints={
                    "video": {"width": {"ideal": 640}, "height": {"ideal": 480}, "frameRate": {"ideal": 24}},
                    "audio": False,
                },
                rtc_configuration={"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]},
            )
        with pred_col:
            st.markdown("**Predictions**")
            box = st.empty()
            box.info("Press START and sign. Results appear here after ~2 seconds.")
        while ctx.state.playing:
            top5 = recognizer.get_top5()
            if top5:
                with box.container():
                    st.markdown(f"### {top5[0][0].upper()}  ({top5[0][1] * 100:.0f}%)")
                    for w, p in top5:
                        st.write(f"{w.upper()} - {p * 100:.1f}%")
                        st.progress(min(p, 1.0))
            time.sleep(0.5)
    except ImportError:
        st.error("Install streamlit-webrtc: pip install streamlit-webrtc")
