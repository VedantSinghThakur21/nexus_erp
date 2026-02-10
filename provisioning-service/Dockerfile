FROM frappe/erpnext:v15

USER root
WORKDIR /app

# Install dependencies for the provisioning service
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the service code
COPY app.py .

# Switch back to frappe user for security and to access bench commands
USER frappe

# The BENCH_PATH will be mounted from the Frappe container's volume
# Standard path in the container is /home/frappe/frappe-bench
ENV BENCH_PATH=/home/frappe/frappe-bench
ENV PROVISIONING_PORT=8001

EXPOSE 8001

CMD ["python3", "app.py"]
