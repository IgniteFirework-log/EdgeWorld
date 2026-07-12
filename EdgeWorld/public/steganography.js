const enc = new TextEncoder();
const dec = new TextDecoder();

const sampleImage = document.getElementById("sampleImage");
const scanSampleButton = document.getElementById("scanSampleButton");
const scanReadout = document.getElementById("scanReadout");
const scanPercent = document.getElementById("scanPercent");
const sampleMessage = document.getElementById("sampleMessage");
const sampleMessageText = document.getElementById("sampleMessageText");
const introDecodeButton = document.getElementById("introDecodeButton");
const introDecodeOutput = document.getElementById("introDecodeOutput");
const missionLabel = document.getElementById("missionLabel");
const missionProgress = document.getElementById("missionProgress");

const embedImageInput = document.getElementById("embedImage");
const embedImageButton = document.getElementById("embedImageBtn");
const embedImageLabel = document.getElementById("embedImageLabel");
const embedTextInput = document.getElementById("embedText");
const embedButton = document.getElementById("embedButton");
const embedStatus = document.getElementById("embedStatus");
const charCount = document.getElementById("charCount");
const resultCanvas = document.getElementById("resultCanvas");
const resultStage = document.getElementById("resultStage");
const downloadImage = document.getElementById("downloadImage");
const ctx = resultCanvas.getContext("2d", { willReadFrequently: true });

const extractImageInput = document.getElementById("extractImage");
const extractImageButton = document.getElementById("extractImageBtn");
const extractImageLabel = document.getElementById("extractImageLabel");
const extractButton = document.getElementById("extractButton");
const extractOutput = document.getElementById("extractOutput");
const bundledSampleMessage =
  "-----the hyper secret text-----\n英語IIIは楽単です。(このことは秘密にしてください。)";

function updateMission(step) {
  const clamped = Math.min(Math.max(step, 1), 3);
  missionLabel.textContent = `ACCESS 0${clamped} / 03`;
  missionProgress.style.width = `${(clamped / 3) * 100}%`;
}

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.classList.remove("success", "error");
  if (type) {
    element.classList.add(type);
  }
}

function loadImage(fileOrUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("画像の読み込みに失敗しました"));

    if (typeof fileOrUrl === "string") {
      image.src = fileOrUrl;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsDataURL(fileOrUrl);
  });
}

function getImageData(image) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function embed(imageData, message) {
  const bytes = enc.encode(message);
  const lengthBytes = new Uint8Array(4);
  new DataView(lengthBytes.buffer).setUint32(0, bytes.length, false);
  const payload = new Uint8Array([...lengthBytes, ...bytes]);
  const pixels = imageData.data;
  const capacity = Math.floor(pixels.length / 4) * 3;

  if (payload.length * 8 > capacity) {
    return { ok: false, error: "この画像にはメッセージが収まりません" };
  }

  for (let index = 0; index < payload.length * 8; index += 1) {
    const bit =
      (payload[Math.floor(index / 8)] >> (7 - (index % 8))) & 1;
    const channel = Math.floor(index / 3) * 4 + (index % 3);
    pixels[channel] = (pixels[channel] & 0xfe) | bit;
  }

  return { ok: true };
}

function extract(imageData) {
  const pixels = imageData.data;
  const capacity = Math.floor(pixels.length / 4) * 3;

  if (capacity < 32) {
    return { ok: false, error: "画像が小さすぎます" };
  }

  let length = 0;
  for (let index = 0; index < 32; index += 1) {
    const channel = Math.floor(index / 3) * 4 + (index % 3);
    length = (length << 1) | (pixels[channel] & 1);
  }
  length >>>= 0;

  if (length === 0 || length > 100000 || 32 + length * 8 > capacity) {
    return { ok: false, error: "隠された信号を検出できませんでした" };
  }

  const bytes = new Uint8Array(length);
  for (let index = 0; index < length * 8; index += 1) {
    const bitIndex = 32 + index;
    const channel = Math.floor(bitIndex / 3) * 4 + (bitIndex % 3);
    bytes[Math.floor(index / 8)] |=
      (pixels[channel] & 1) << (7 - (index % 8));
  }

  try {
    return { ok: true, text: dec.decode(bytes) };
  } catch {
    return { ok: false, error: "信号の復号に失敗しました" };
  }
}

function typeMessage(element, text) {
  element.textContent = "";
  let index = 0;

  const timer = window.setInterval(() => {
    element.textContent += text[index] || "";
    index += 1;
    if (index >= text.length) {
      window.clearInterval(timer);
    }
  }, 34);
}

function setIntroDecodeOutput(label, message, type = "") {
  if (!introDecodeOutput) {
    return;
  }

  introDecodeOutput.classList.add("is-visible");
  introDecodeOutput.classList.remove("success", "error");
  if (type) {
    introDecodeOutput.classList.add(type);
  }
  introDecodeOutput.innerHTML = `<span>${label}</span><p></p>`;
  introDecodeOutput.querySelector("p").textContent = message;
}

async function extractBundledSample() {
  try {
    const image = await loadImage(sampleImage.currentSrc || sampleImage.src);
    return extract(getImageData(image));
  } catch (error) {
    const message = String(error?.message || "");
    const isFileCanvasRestriction =
      error?.name === "SecurityError" ||
      message.includes("tainted") ||
      message.includes("cross-origin");

    if (window.location.protocol === "file:" && isFileCanvasRestriction) {
      return { ok: true, text: bundledSampleMessage };
    }

    throw error;
  }
}

let sampleDetectionRunning = false;

async function decodeSampleImage() {
  if (sampleDetectionRunning) {
    return;
  }

  sampleDetectionRunning = true;
  if (scanSampleButton) {
    scanSampleButton.disabled = true;
  }
  if (introDecodeButton) {
    introDecodeButton.disabled = true;
  }
  if (scanReadout) {
    scanReadout.textContent = "SCANNING PIXELS";
  }
  sampleMessage?.classList.remove("is-visible");
  setIntroDecodeOutput("DECODING", "画像データを読み取っています...");

  let progress = 0;
  const progressTimer = window.setInterval(() => {
    progress = Math.min(progress + Math.floor(Math.random() * 18 + 10), 99);
    if (scanPercent) {
      scanPercent.textContent = `${String(progress).padStart(2, "0")}%`;
    }
  }, 120);

  try {
    const result = await extractBundledSample();
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    window.clearInterval(progressTimer);
    if (scanPercent) {
      scanPercent.textContent = "100%";
    }

    if (!result.ok) {
      throw new Error(result.error);
    }

    if (scanReadout) {
      scanReadout.textContent = "TEXT DETECTED";
    }
    sampleMessage?.classList.add("is-visible");
    if (sampleMessageText) {
      typeMessage(sampleMessageText, result.text);
    }
    if (scanSampleButton) {
      scanSampleButton.querySelector("span").textContent = "文章を検出しました";
      scanSampleButton.querySelector("b").textContent = "COMPLETE";
    }
    if (introDecodeButton) {
      introDecodeButton.querySelector("span").textContent = "文章を検出しました";
      introDecodeButton.querySelector("b").textContent = "UNLOCKED";
    }
    setIntroDecodeOutput("検出された文章", result.text, "success");
    document.body.classList.add("has-intro-decoded");
    updateMission(2);
  } catch (error) {
    window.clearInterval(progressTimer);
    if (scanReadout) {
      scanReadout.textContent = "SCAN FAILED";
    }
    sampleMessage?.classList.add("is-visible");
    if (sampleMessageText) {
      sampleMessageText.textContent = error.message;
    }
    if (scanSampleButton) {
      scanSampleButton.disabled = false;
    }
    if (introDecodeButton) {
      introDecodeButton.disabled = false;
    }
    setIntroDecodeOutput("DECODE FAILED", error.message, "error");
  } finally {
    sampleDetectionRunning = false;
  }
}

scanSampleButton?.addEventListener("click", () => decodeSampleImage());
introDecodeButton?.addEventListener("click", () => decodeSampleImage());

embedImageButton.addEventListener("click", () => embedImageInput.click());

embedImageInput.addEventListener("change", () => {
  const file = embedImageInput.files?.[0];
  if (!file) {
    return;
  }

  embedImageButton.classList.add("is-selected");
  embedImageLabel.innerHTML = `<b>${file.name}</b><small>${(
    file.size /
    1024 /
    1024
  ).toFixed(2)} MB // READY</small>`;
  setStatus(embedStatus, "IMAGE LOADED // AWAITING MESSAGE");
});

embedTextInput.addEventListener("input", () => {
  charCount.textContent = embedTextInput.value.length;
});

embedButton.addEventListener("click", async () => {
  const file = embedImageInput.files?.[0];
  const message = embedTextInput.value.trim();

  if (!file) {
    setStatus(embedStatus, "ERROR // 画像を選択してください", "error");
    return;
  }
  if (!message) {
    setStatus(embedStatus, "ERROR // メッセージを入力してください", "error");
    return;
  }

  embedButton.disabled = true;
  setStatus(embedStatus, "INJECTING DATA INTO PIXELS...");

  try {
    const image = await loadImage(file);
    resultCanvas.width = image.naturalWidth;
    resultCanvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(
      0,
      0,
      resultCanvas.width,
      resultCanvas.height,
    );
    const result = embed(imageData, message);

    if (!result.ok) {
      throw new Error(result.error);
    }

    ctx.putImageData(imageData, 0, 0);
    downloadImage.href = resultCanvas.toDataURL("image/png");
    resultStage.hidden = false;
    setStatus(embedStatus, "SUCCESS // SIGNAL EMBEDDED", "success");
    updateMission(3);
    resultStage.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    setStatus(embedStatus, `ERROR // ${error.message}`, "error");
  } finally {
    embedButton.disabled = false;
  }
});

extractImageButton.addEventListener("click", () => extractImageInput.click());

extractImageInput.addEventListener("change", () => {
  const file = extractImageInput.files?.[0];
  if (!file) {
    return;
  }
  extractImageLabel.textContent = file.name;
  setStatus(extractOutput, "IMAGE LOADED // READY TO DECODE");
});

extractButton.addEventListener("click", async () => {
  const file = extractImageInput.files?.[0];
  if (!file) {
    setStatus(extractOutput, "ERROR // 画像を選択してください", "error");
    return;
  }

  extractButton.disabled = true;
  setStatus(extractOutput, "SCANNING...");

  try {
    const image = await loadImage(file);
    const result = extract(getImageData(image));
    if (!result.ok) {
      throw new Error(result.error);
    }
    setStatus(extractOutput, result.text, "success");
  } catch (error) {
    setStatus(extractOutput, `ERROR // ${error.message}`, "error");
  } finally {
    extractButton.disabled = false;
  }
});
