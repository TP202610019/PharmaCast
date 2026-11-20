# ML Service QA on the VPS

The public entry point is https://www.pharmacast.online/services/ml/docs.
Vercel forwards the entire prefix to the existing HTTPS API host.

Add the following service to the Compose configuration on the VPS. Use the
network shared by the Nginx web container and the other Compose services.

```yaml
services:
  ml-qa:
    image: pharmacast-ml:latest
    command: ["uvicorn", "app.qa:app", "--host", "0.0.0.0", "--port", "8000", "--root-path", "/services/ml"]
    environment:
      ML_QA_DIAGNOSTICS_ONLY: "1"
      LOCAL_STORAGE_ENABLED: "true"
```

Build or deploy the ML image containing app/qa.py first. The QA container needs
no host port, production credentials, or storage mounts.

In the Nginx HTTPS server block for api.pharmacast.online, add the location
below. Mount an htpasswd file at the specified path and provision credentials
for the evaluators before enabling the route.

```nginx
location ^~ /services/ml/ {
    auth_basic "PharmaCast QA";
    auth_basic_user_file /etc/nginx/qa.htpasswd;
    proxy_pass http://ml-qa:8000/;
    proxy_read_timeout 120s;
    add_header Cache-Control "no-store" always;
}
```

Start ml-qa, run nginx -t in the web container, and reload Nginx. After Vercel
deploys, verify that anonymous requests return 401. With evaluator credentials,
open Swagger, load its OpenAPI schema, and execute Calculate Error Metrics
with [100, 200] and [110, 180]. Expect MAE 15, RMSE approximately 15.8114, and
MAPE 10%. This verifies the calculation, while persistence is covered through
the prediction backend. The application prediction routes continue to use the
internal ML Service.
