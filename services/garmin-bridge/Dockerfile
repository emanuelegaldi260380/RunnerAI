# Garmin Bridge — Python + Chrome per eseguire garmin-givemydata (SeleniumBase UC).
FROM python:3.12-slim

# Dipendenze di sistema: Google Chrome + xvfb (UC mode può richiedere un display
# virtuale anche in "headless" per superare Cloudflare) + utilità.
RUN apt-get update && apt-get install -y --no-install-recommends \
      wget gnupg ca-certificates xvfb \
      fonts-liberation libnss3 libxss1 libasound2 libgbm1 libgtk-3-0 \
    && wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y --no-install-recommends /tmp/chrome.deb \
    && rm -f /tmp/chrome.deb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# I dati/sessioni per-utente vivono qui (montare un volume persistente).
ENV GARMIN_DATA_ROOT=/data
VOLUME ["/data"]

EXPOSE 8080
# xvfb-run fornisce un display virtuale al processo (necessario per UC mode).
CMD ["xvfb-run", "-a", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
