// Internationalization system
const translations = {
  en: {
    title: "🎵 Gentle Audio Transcription Viewer",
    "playback-speed": "Playback Speed:",
    custom: "Custom:",
    apply: "Apply",
    footer:
      "Audio transcription visualization tool developed by Fernando Barrios",
    loading: "Loading...",
    "transcription-progress": "transcription in progress",
    "speed-error": "Speed must be between 0.1x and 4x",
    "select-audio": "Select Audio File:",
    "select-json": "Select JSON File:",
    "no-file-selected": "No file selected",
    "load-files": "Load Files",
    "file-error": "Please select both audio and JSON files",
    "json-error": "Invalid JSON file format",
    "audio-error": "Invalid audio file format",
    "files-loaded": "Files loaded successfully!",
    "upload-files": "Upload Files",
    "use-urls": "Use URLs",
    "audio-url": "Audio URL:",
    "json-url": "JSON URL:",
    "enter-valid-url": "Enter a valid URL",
    "url-error": "Please enter both audio and JSON URLs",
    "url-load-error": "Error loading from URL",
    "invalid-url": "Invalid URL format",
    "valid-url": "Valid URL",
    "select-files-message": "Please select audio and JSON files to begin",
    "dark-mode": "Dark Mode",
    "use-examples": "Use Examples",
  },
  es: {
    title: "🎵 Visualizador de Transcripciones de Audio Gentle",
    "playback-speed": "Velocidad de reproducción:",
    custom: "Personalizada:",
    apply: "Aplicar",
    footer:
      "Herramienta de visualización de transcripciones desarrollada por Fernando Barrios",
    loading: "Cargando...",
    "transcription-progress": "transcripción en progreso",
    "speed-error": "La velocidad debe estar entre 0.1x y 4x",
    "select-audio": "Seleccionar archivo de audio:",
    "select-json": "Seleccionar archivo JSON:",
    "no-file-selected": "Ningún archivo seleccionado",
    "load-files": "Cargar archivos",
    "file-error": "Por favor selecciona ambos archivos (audio y JSON)",
    "json-error": "Formato de archivo JSON inválido",
    "audio-error": "Formato de archivo de audio inválido",
    "files-loaded": "¡Archivos cargados exitosamente!",
    "upload-files": "Subir archivos",
    "use-urls": "Usar URLs",
    "audio-url": "URL del audio:",
    "json-url": "URL del JSON:",
    "enter-valid-url": "Ingresa una URL válida",
    "url-error": "Por favor ingresa ambas URLs (audio y JSON)",
    "url-load-error": "Error al cargar desde la URL",
    "invalid-url": "Formato de URL inválido",
    "valid-url": "URL válida",
    "select-files-message":
      "Por favor selecciona archivos de audio y JSON para comenzar",
    "dark-mode": "Modo Oscuro",
    "use-examples": "Usar Ejemplos",
  },
};

let currentLanguage = "en";

function updateLanguage(lang) {
  currentLanguage = lang;

  // Update all elements with data-i18n attribute
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (translations[lang] && translations[lang][key]) {
      element.textContent = translations[lang][key];
    }
  });

  // Update language buttons
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-lang") === lang) {
      btn.classList.add("active");
    }
  });

  // Update loading text if present
  if (
    $trans &&
    ($trans.textContent === "Loading..." ||
      $trans.textContent === "Cargando...")
  ) {
    $trans.textContent = translations[lang].loading;
  }

  // Update dark mode button tooltip
  updateDarkModeText();

  // Save language preference
  localStorage.setItem("preferred-language", lang);
}

function initLanguageSelector() {
  // Load saved language preference
  const savedLang = localStorage.getItem("preferred-language") || "en";
  updateLanguage(savedLang);

  // Add event listeners to language buttons
  document.querySelectorAll(".lang-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const lang = this.getAttribute("data-lang");
      updateLanguage(lang);
    });
  });
}

// Utility functions
function get(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onload = function () {
    cb(this.responseText);
  };
  xhr.send();
}

function get_json(url, cb) {
  get(url, function (x) {
    cb(JSON.parse(x));
  });
}

// Audio and transcript variables
var $a = document.getElementById("audio");
var $trans = document.getElementById("transcript");
var $preloader = document.getElementById("preloader");

var wds = [];
var cur_wd;

var $phones = document.createElement("div");
$phones.className = "phones";
document.body.appendChild($phones);

var cur_phones$ = []; // List of phoneme $divs
var $active_phone;

// Keyboard controls
window.onkeydown = function (ev) {
  if (ev.keyCode == 32) {
    ev.preventDefault();
    $a.pause();
  }
};

// Phoneme rendering functions
function render_phones(wd) {
  cur_phones$ = [];
  $phones.innerHTML = "";
  $active_phone = null;

  $phones.style.top = wd.$div.offsetTop + 20;
  $phones.style.left = wd.$div.offsetLeft;

  var dur = wd.end - wd.start;
  var start_x = wd.$div.offsetLeft;

  wd.phones.forEach(function (ph) {
    var $p = document.createElement("span");
    $p.className = "phone";
    $p.textContent = ph.phone.split("_")[0];

    $phones.appendChild($p);
    cur_phones$.push($p);
  });

  var offsetToCenter = (wd.$div.offsetWidth - $phones.offsetWidth) / 2;
  $phones.style.left = wd.$div.offsetLeft + offsetToCenter;
}

function highlight_phone(t) {
  if (!cur_wd) {
    $phones.innerHTML = "";
    return;
  }
  var hit;
  var cur_t = cur_wd.start;

  cur_wd.phones.forEach(function (ph, idx) {
    if (cur_t <= t && cur_t + ph.duration >= t) {
      hit = idx;
    }
    cur_t += ph.duration;
  });

  if (hit) {
    var $ph = cur_phones$[hit];
    if ($ph != $active_phone) {
      if ($active_phone) {
        $active_phone.classList.remove("phactive");
      }
      if ($ph) {
        $ph.classList.add("phactive");
      }
    }
    $active_phone = $ph;
  }
}

// Word highlighting function
function highlight_word() {
  var t = $a.currentTime;
  // XXX: O(N); use binary search
  var hits = wds.filter(function (x) {
    return t - x.start > 0.01 && x.end - t > 0.01;
  }, wds);
  var next_wd = hits[hits.length - 1];

  if (cur_wd != next_wd) {
    var active = document.querySelectorAll(".active");
    for (var i = 0; i < active.length; i++) {
      active[i].classList.remove("active");
    }
    if (next_wd && next_wd.$div) {
      next_wd.$div.classList.add("active");
      render_phones(next_wd);
    }
  }
  cur_wd = next_wd;
  highlight_phone(t);

  window.requestAnimationFrame(highlight_word);
}

// Transcript rendering function
function render(ret) {
  wds = ret["words"] || [];
  transcript = ret["transcript"];

  $trans.innerHTML = "";

  var currentOffset = 0;

  wds.forEach(function (wd) {
    if (wd.case == "not-found-in-transcript") {
      // TODO: show phonemes somewhere
      var txt = " " + wd.word;
      var $plaintext = document.createTextNode(txt);
      $trans.appendChild($plaintext);
      return;
    }

    // Add non-linked text
    if (wd.startOffset > currentOffset) {
      var txt = transcript.slice(currentOffset, wd.startOffset);
      var $plaintext = document.createTextNode(txt);
      $trans.appendChild($plaintext);
      currentOffset = wd.startOffset;
    }

    var $wd = document.createElement("span");
    var txt = transcript.slice(wd.startOffset, wd.endOffset);
    var $wdText = document.createTextNode(txt);
    $wd.appendChild($wdText);
    wd.$div = $wd;
    if (wd.start !== undefined) {
      $wd.className = "success";
    }
    $wd.onclick = function () {
      if (wd.start !== undefined) {
        console.log(wd.start);
        $a.currentTime = wd.start;
        $a.play();
      }
    };
    $trans.appendChild($wd);
    currentOffset = wd.endOffset;
  });

  var txt = transcript.slice(currentOffset, transcript.length);
  var $plaintext = document.createTextNode(txt);
  $trans.appendChild($plaintext);
  currentOffset = transcript.length;
}

// Status rendering variables and functions
var status_init = false;
var status_log = []; // [ status ]
var $status_pro;

function render_status(ret) {
  if (!status_init) {
    // Clobber the $trans div and use it for status updates
    $trans.innerHTML = "<h2>transcription in progress</h2>";
    $trans.className = "status";
    $status_pro = document.createElement("progress");
    $status_pro.setAttribute("min", "0");
    $status_pro.setAttribute("max", "100");
    $status_pro.value = 0;
    $trans.appendChild($status_pro);

    status_init = true;
  }
  if (ret.status !== "TRANSCRIBING") {
    if (ret.percent) {
      $status_pro.value = 100 * ret.percent;
    }
  } else if (
    ret.percent &&
    (status_log.length == 0 ||
      status_log[status_log.length - 1].percent + 0.0001 < ret.percent)
  ) {
    // New entry
    var $entry = document.createElement("div");
    $entry.className = "entry";
    $entry.textContent = ret.message;
    ret.$div = $entry;

    if (ret.percent) {
      $status_pro.value = 100 * ret.percent;
    }

    if (status_log.length > 0) {
      $trans.insertBefore($entry, status_log[status_log.length - 1].$div);
    } else {
      $trans.appendChild($entry);
    }
    status_log.push(ret);
  }
}

// File handling variables
let selectedAudioFile = null;
let selectedJsonFile = null;
let currentInputMode = "file"; // "file" or "url"

// Input mode switching functionality
function initInputModeSelector() {
  const modeButtons = document.querySelectorAll(".mode-btn");
  const fileSection = document.getElementById("fileSection");
  const urlSection = document.getElementById("urlSection");

  modeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const mode = this.getAttribute("data-mode");
      currentInputMode = mode;

      // Update button states
      modeButtons.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");

      // Show/hide sections
      if (mode === "file") {
        fileSection.classList.add("active");
        urlSection.classList.remove("active");
      } else {
        fileSection.classList.remove("active");
        urlSection.classList.add("active");
      }

      // Update load button state
      updateLoadButtonState();
    });
  });
}

// URL validation and status update
function initUrlInputs() {
  const audioUrlInput = document.getElementById("audioUrl");
  const jsonUrlInput = document.getElementById("jsonUrl");
  const audioUrlStatus = document.getElementById("audioUrlStatus");
  const jsonUrlStatus = document.getElementById("jsonUrlStatus");

  function validateUrl(input, statusElement) {
    const url = input.value.trim();
    if (!url) {
      statusElement.textContent =
        translations[currentLanguage]["enter-valid-url"];
      statusElement.className = "url-status";
      return false;
    }

    try {
      new URL(url);
      statusElement.textContent = translations[currentLanguage]["valid-url"];
      statusElement.className = "url-status valid";
      return true;
    } catch {
      statusElement.textContent = translations[currentLanguage]["invalid-url"];
      statusElement.className = "url-status invalid";
      return false;
    }
  }

  audioUrlInput.addEventListener("input", function () {
    validateUrl(this, audioUrlStatus);
    updateLoadButtonState();
  });

  jsonUrlInput.addEventListener("input", function () {
    validateUrl(this, jsonUrlStatus);
    updateLoadButtonState();
  });
}

// File upload functionality
function initFileUpload() {
  const audioFileInput = document.getElementById("audioFile");
  const jsonFileInput = document.getElementById("jsonFile");
  const audioFileName = document.getElementById("audioFileName");
  const jsonFileName = document.getElementById("jsonFileName");
  const loadFilesBtn = document.getElementById("loadFiles");
  const useExamplesBtn = document.getElementById("useExamples");

  // Handle audio file selection
  audioFileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      selectedAudioFile = file;
      audioFileName.textContent = file.name;
      audioFileName.classList.add("selected");
      updateLoadButtonState();
    } else {
      selectedAudioFile = null;
      audioFileName.textContent =
        translations[currentLanguage]["no-file-selected"];
      audioFileName.classList.remove("selected");
      updateLoadButtonState();
    }
  });

  // Handle JSON file selection
  jsonFileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      selectedJsonFile = file;
      jsonFileName.textContent = file.name;
      jsonFileName.classList.add("selected");
      updateLoadButtonState();
    } else {
      selectedJsonFile = null;
      jsonFileName.textContent =
        translations[currentLanguage]["no-file-selected"];
      jsonFileName.classList.remove("selected");
      updateLoadButtonState();
    }
  });

  // Handle load files button
  loadFilesBtn.addEventListener("click", function () {
    if (currentInputMode === "file") {
      if (selectedAudioFile && selectedJsonFile) {
        loadUserFiles();
      } else {
        alert(translations[currentLanguage]["file-error"]);
      }
    } else {
      loadFromUrls();
    }
  });

  useExamplesBtn.addEventListener("click", function () {
    const audioSrc = document.getElementById("audioUrl");
    const jsonSrc = document.getElementById("jsonUrl");

    const locationInfo = window.location.href;

    audioSrc.value = `${locationInfo}examples/The-Hound-of-the-Baskervilles/chapter-1/a.wav`;
    jsonSrc.value = `${locationInfo}examples/The-Hound-of-the-Baskervilles/chapter-1/align.json`;

    loadFromUrls();
  });

  // Initialize button state
  updateLoadButtonState();
}

function loadUserFiles() {
  // Load audio file
  if (selectedAudioFile) {
    const audioURL = URL.createObjectURL(selectedAudioFile);
    $a.src = audioURL;
    $a.load();
  }

  // Load JSON file
  if (selectedJsonFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const jsonData = JSON.parse(e.target.result);
        render(jsonData);

        // Show success message
        $trans.innerHTML = `<div style="text-align: center; color: #28a745; font-weight: bold; padding: 20px;">
          ${translations[currentLanguage]["files-loaded"]}
        </div>`;

        // Clear the success message after 2 seconds and render the transcript
        setTimeout(() => {
          render(jsonData);
        }, 2000);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        alert(translations[currentLanguage]["json-error"]);
      }
    };
    reader.readAsText(selectedJsonFile);
  }
}

// URL loading functionality
function loadFromUrls() {
  const audioUrl = document.getElementById("audioUrl").value.trim();
  const jsonUrl = document.getElementById("jsonUrl").value.trim();

  if (!audioUrl || !jsonUrl) {
    alert(translations[currentLanguage]["url-error"]);
    return;
  }

  try {
    new URL(audioUrl);
    new URL(jsonUrl);
  } catch {
    alert(translations[currentLanguage]["invalid-url"]);
    return;
  }

  // Load audio from URL
  $a.src = audioUrl;
  $a.load();

  // Load JSON from URL
  fetch(jsonUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((jsonData) => {
      render(jsonData);

      // Show success message
      $trans.innerHTML = `<div style="text-align: center; color: #28a745; font-weight: bold; padding: 20px;">
        ${translations[currentLanguage]["files-loaded"]}
      </div>`;

      // Clear the success message after 2 seconds and render the transcript
      setTimeout(() => {
        render(jsonData);
      }, 2000);
    })
    .catch((error) => {
      console.error("Error loading from URL:", error);
      alert(
        translations[currentLanguage]["url-load-error"] + ": " + error.message
      );
    });
}

// Update load button state based on current mode
function updateLoadButtonState() {
  const loadFilesBtn = document.getElementById("loadFiles");

  if (currentInputMode === "file") {
    // File mode: check if both files are selected
    if (selectedAudioFile && selectedJsonFile) {
      loadFilesBtn.disabled = false;
    } else {
      loadFilesBtn.disabled = true;
    }
  } else {
    // URL mode: check if both URLs are valid
    const audioUrl = document.getElementById("audioUrl").value.trim();
    const jsonUrl = document.getElementById("jsonUrl").value.trim();

    let audioValid = false;
    let jsonValid = false;

    if (audioUrl) {
      try {
        new URL(audioUrl);
        audioValid = true;
      } catch {}
    }

    if (jsonUrl) {
      try {
        new URL(jsonUrl);
        jsonValid = true;
      } catch {}
    }

    if (audioValid && jsonValid) {
      loadFilesBtn.disabled = false;
    } else {
      loadFilesBtn.disabled = true;
    }
  }
}

// Speed control functionality
function initSpeedControls() {
  const speedButtons = document.querySelectorAll(".speed-btn[data-speed]");

  // Handle preset speed buttons
  speedButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const speed = parseFloat(this.getAttribute("data-speed"));
      setPlaybackSpeed(speed);
      updateActiveSpeedButton(this);
    });
  });
}

function setPlaybackSpeed(speed) {
  $a.playbackRate = speed;
}

function updateActiveSpeedButton(activeButton) {
  // Remove active class from all speed buttons
  document.querySelectorAll(".speed-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Add active class to the clicked button
  if (activeButton && activeButton.hasAttribute("data-speed")) {
    activeButton.classList.add("active");
  }
}

// Dark mode functionality
let currentTheme = "light";

function toggleDarkMode() {
  const body = document.body;
  const darkModeToggle = document.getElementById("darkModeToggle");

  if (currentTheme === "light") {
    // Switch to dark mode
    body.setAttribute("data-theme", "dark");
    darkModeToggle.classList.add("active");
    darkModeToggle.textContent = "☀️";
    darkModeToggle.title =
      currentLanguage === "es"
        ? "Cambiar a modo claro"
        : "Switch to Light Mode";
    currentTheme = "dark";
  } else {
    // Switch to light mode
    body.removeAttribute("data-theme");
    darkModeToggle.classList.remove("active");
    darkModeToggle.textContent = "🌙";
    darkModeToggle.title =
      currentLanguage === "es"
        ? "Cambiar a modo oscuro"
        : "Switch to Dark Mode";
    currentTheme = "light";
  }

  // Save theme preference
  localStorage.setItem("preferred-theme", currentTheme);
}

function initDarkMode() {
  const darkModeToggle = document.getElementById("darkModeToggle");

  // Load saved theme preference
  const savedTheme = localStorage.getItem("preferred-theme") || "light";
  currentTheme = savedTheme;

  // Apply saved theme
  if (savedTheme === "dark") {
    document.body.setAttribute("data-theme", "dark");
    darkModeToggle.classList.add("active");
    darkModeToggle.textContent = "☀️";
    darkModeToggle.title =
      currentLanguage === "es"
        ? "Cambiar a modo claro"
        : "Switch to Light Mode";
  } else {
    darkModeToggle.textContent = "🌙";
    darkModeToggle.title =
      currentLanguage === "es"
        ? "Cambiar a modo oscuro"
        : "Switch to Dark Mode";
  }

  // Add event listener
  darkModeToggle.addEventListener("click", toggleDarkMode);
}

// Update dark mode button text when language changes
function updateDarkModeText() {
  const darkModeToggle = document.getElementById("darkModeToggle");
  if (currentTheme === "dark") {
    darkModeToggle.title =
      currentLanguage === "es"
        ? "Cambiar a modo claro"
        : "Switch to Light Mode";
  } else {
    darkModeToggle.title =
      currentLanguage === "es"
        ? "Cambiar a modo oscuro"
        : "Switch to Dark Mode";
  }
}

// Set initial empty state message
function setInitialMessage() {
  $trans.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px; font-style: italic;">
    ${
      translations[currentLanguage]["select-files-message"] ||
      "Please select audio and JSON files to begin"
    }
  </div>`;
}

// Initialize all systems when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Initialize language system
  initLanguageSelector();

  // Initialize dark mode
  initDarkMode();

  // Initialize with empty state - no automatic loading
  $trans.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px; font-style: italic;">
    ${
      translations[currentLanguage]
        ? translations[currentLanguage]["select-files-message"] ||
          "Please select audio and JSON files to begin"
        : "Please select audio and JSON files to begin"
    }
  </div>`;

  // Initialize all systems
  initInputModeSelector();
  initUrlInputs();
  initFileUpload();
  initSpeedControls();

  // Set initial message after language system is ready
  setTimeout(setInitialMessage, 100);

  // Start word highlighting animation
  window.requestAnimationFrame(highlight_word);
});

// Add keyboard shortcuts
window.addEventListener("keydown", function (ev) {
  // Don't interfere with existing spacebar functionality
  if (ev.keyCode == 32) {
    ev.preventDefault();
    if ($a.paused) {
      $a.play();
    } else {
      $a.pause();
    }
    return;
  }

  // Speed control shortcuts
  if (ev.ctrlKey || ev.metaKey) {
    switch (ev.keyCode) {
      case 49: // Ctrl/Cmd + 1
        ev.preventDefault();
        setPlaybackSpeed(1);
        updateActiveSpeedButton(
          document.querySelector('.speed-btn[data-speed="1"]')
        );
        break;
      case 50: // Ctrl/Cmd + 2
        ev.preventDefault();
        setPlaybackSpeed(1.25);
        updateActiveSpeedButton(
          document.querySelector('.speed-btn[data-speed="1.25"]')
        );
        break;
      case 51: // Ctrl/Cmd + 3
        ev.preventDefault();
        setPlaybackSpeed(1.5);
        updateActiveSpeedButton(
          document.querySelector('.speed-btn[data-speed="1.5"]')
        );
        break;
      case 188: // Ctrl/Cmd + , (comma) - slower
        ev.preventDefault();
        const currentSpeed = $a.playbackRate;
        const newSlowerSpeed = Math.max(0.1, currentSpeed - 0.25);
        setPlaybackSpeed(newSlowerSpeed);
        updateActiveSpeedButton(null);
        break;
      case 190: // Ctrl/Cmd + . (period) - faster
        ev.preventDefault();
        const currentSpeedFaster = $a.playbackRate;
        const newFasterSpeed = Math.min(4, currentSpeedFaster + 0.25);
        setPlaybackSpeed(newFasterSpeed);
        updateActiveSpeedButton(null);
        break;
    }
  }
});
