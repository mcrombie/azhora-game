"""Make one uploadable CloudShell release, using the already bundled handler."""
import hashlib, json, pathlib, zipfile
root=pathlib.Path(__file__).resolve().parents[2]
out=root/"tests"/"artifacts"/"chronicles"
out.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out/"chronicles.zip","w",zipfile.ZIP_DEFLATED) as archive:
    archive.write(out/"handler.cjs","handler.cjs")
with zipfile.ZipFile(out/"azhora-press-release.zip","w",zipfile.ZIP_DEFLATED) as archive:
    archive.write(out/"chronicles.zip","azhora-press/chronicles.zip")
    for name in ["deploy.py","template.json","reconcile.py"]:
        archive.write(root/"services"/"chronicles"/name,"azhora-press/"+name)
    sample=root/"tests"/"artifacts"/"settlements"/"settlement-pack.json"
    if sample.exists():
        pack=json.loads(sample.read_text())
        archive.writestr("azhora-press/sample-entry.json",json.dumps(pack["entries"][0]["entry"]))
print(json.dumps({"archive":str(out/"azhora-press-release.zip"),"sha256":hashlib.sha256((out/"azhora-press-release.zip").read_bytes()).hexdigest()}))
