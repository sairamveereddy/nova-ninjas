import json
from dodopayments import DodoPayments
client = DodoPayments(bearer_token="VlSrQp7v8yEwy3UB.Lzvf3GZC-wqETu11N-S8paVhoWjfyJfUHmPVDi-6g8HrvTaC")

all_products = client.products.list()
res = {}
for p in all_products.items:
    if "No Trial" in p.name:
        res[p.name] = p.product_id

with open("dodo_new_ids.json", "w") as f:
    json.dump(res, f, indent=4)
