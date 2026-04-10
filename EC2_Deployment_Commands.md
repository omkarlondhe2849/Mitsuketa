sudo yum update -y
sudo yum install python3 python3-pip git -y

wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar xvf ffmpeg-release-amd64-static.tar.xz
sudo mv ffmpeg-*-static/ffmpeg /usr/local/bin/
sudo mv ffmpeg-*-static/ffprobe /usr/local/bin/
rm -rf ffmpeg-release-amd64-static*

git clone https://github.com/omkarlondhe2849/Mitsuketa.git
cd Mitsuketa

python3 -m venv venv
source venv/bin/activate

pip install "fastapi[all]" uvicorn numpy scipy librosa imagehash Pillow pydub opencv-python-headless

python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
