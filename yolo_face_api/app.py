# yolo_face_api/app.py

from flask import Flask, request, jsonify
import cv2
import numpy as np
from ultralytics import YOLO
import base64
from PIL import Image

app = Flask(__name__)

# ✅ YOLOv8 얼굴 탐지 모델 로드 (필요시 yolov8n-face.pt로 교체 가능)
model = YOLO('yolov8n.pt')  # 일반 객체 감지 모델 사용 중

@app.route('/')
def index():
    return '✅ YOLOv8 얼굴 감지 API 정상 작동 중입니다.'

@app.route('/detect-faces', methods=['POST'])
def detect_faces():
    try:
        data = request.json
        if 'image' not in data:
            return jsonify({'error': 'image 필드가 없습니다.'}), 400

        # ✅ base64 → OpenCV 이미지 디코딩
        image_data = base64.b64decode(data['image'])
        np_arr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # ✅ YOLO 모델로 얼굴 감지
        results = model(img)[0]
        boxes = results.boxes.xyxy.cpu().numpy() if results.boxes else []

        # ✅ 얼굴 박스를 이미지에 그림
        for box in boxes:
            x1, y1, x2, y2 = box.astype(int)
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # ✅ OpenCV → base64로 다시 인코딩
        _, buffer = cv2.imencode('.jpg', img)
        encoded_image = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            'detected_image': encoded_image,
            'faces': [
                {'x1': int(box[0]), 'y1': int(box[1]), 'x2': int(box[2]), 'y2': int(box[3])}
                for box in boxes
            ]
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
