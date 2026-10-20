/**
 * ==========================================================================
 * 20/10 LIVING BOTANICAL CELEBRATION - SCRIPT ENGINE
 * - Hiệu ứng hoa mọc lan dần kín hết toàn bộ màn hình khi click.
 * - Sau đó mở ra khu vườn hoa với bố cục chuẩn xác không lệch, không che thư.
 * - Carousel spotlight từng thẻ từ trái sang phải vô hạn (thẻ active nổi bật hơn).
 * - Canvas 60fps cánh hoa bay lượn và giai điệu du dương.
 * ==========================================================================
 */

(function () {
  "use strict";

  // TRỊ LỖI KẸT ĐÁY TRANG KHI F5: Ép trình duyệt luôn bắt đầu từ tọa độ (0,0)
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
  
  // Danh sách hình hoa thật đã tách nền hoàn hảo
  const flowerImages = [
    "img/Hoa_1.png", // Hồng phấn dịu dàng
    "img/Hoa_2.png", // Tím thanh lịch
    "img/Hoa_3.png", // Đỏ kiêu sa
    "img/Hoa_4.png", // Vàng tỏa nắng
    "img/Hoa_5.png", // Kem thảo mộc tinh khôi
    "img/Hoa_6.png", // Xanh biếc ngọt ngào
  ];

  // DOM Elements
  const stage = document.querySelector("#living-stage");
  const bloomTriggerBtn = document.querySelector("#bloom-trigger-btn");
  const bloomSpreadOverlay = document.querySelector("#bloom-spread-overlay");
  const fullscreenGarden = document.querySelector("#fullscreen-garden");
  const carouselTrack = document.querySelector("#carousel-track");
  const carouselStage = document.querySelector("#spotlight-carousel");
  const carouselPrevBtn = document.querySelector("#carousel-prev-btn");
  const carouselNextBtn = document.querySelector("#carousel-next-btn");
  const carouselDotsContainer = document.querySelector("#carousel-dots");
  const burstHeartsBtn = document.querySelector("#burst-hearts-btn");
  const audioWidget = document.querySelector("#audio-widget");
  const audioToggleBtn = document.querySelector("#audio-toggle-btn");
  const audioStatusText = document.querySelector("#audio-status-text");

  // Canvas
  const canvas = document.querySelector("#ambient-canvas");
  const ctx = canvas.getContext("2d");

  // State
  let isBloomed = false;
  let isAudioPlaying = false;
  let audioContext = null;
  let synthInterval = null;
  let currentSpotlightIndex = 0;
  let carouselAutoTimer = null;
  const cards = Array.from(carouselTrack ? carouselTrack.querySelectorAll(".friend-card") : []);
  const totalCards = cards.length;

  // ==========================================================================
  // 1. CANVAS ENGINE: CÁNH HOA 3D BAY LƯỢN & HẠT SÁNG ĐOM ĐÓM (60 FPS)
  // ==========================================================================
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    updateSpotlight(currentSpotlightIndex, false);
  });

  const petals = [];
  const sparks = [];
  const burstParticles = [];

  const petalPalettes = [
    { fill: "#fca5a5", stroke: "#e06575" },
    { fill: "#f87171", stroke: "#c53040" },
    { fill: "#fdba74", stroke: "#ea580c" },
    { fill: "#fef08a", stroke: "#ca8a04" },
    { fill: "#fbcfe8", stroke: "#db2777" },
    { fill: "#e0e7ff", stroke: "#6366f1" },
    { fill: "#fed7aa", stroke: "#f97316" },
  ];

  class Petal {
    constructor(initAtTop = false) {
      this.reset(initAtTop);
    }

    reset(initAtTop = false) {
      this.x = Math.random() * (width + 200) - 100;
      this.y = initAtTop ? -30 - Math.random() * 50 : Math.random() * height;
      this.size = 12 + Math.random() * 16;
      this.speedY = 1.0 + Math.random() * 1.6;
      this.speedX = 0.6 + Math.random() * 1.2;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.03;
      this.flip = Math.random() * Math.PI;
      this.flipSpeed = 0.02 + Math.random() * 0.03;
      this.sway = Math.random() * Math.PI * 2;
      this.swaySpeed = 0.015 + Math.random() * 0.02;
      this.opacity = 0.45 + Math.random() * 0.45;
      this.color = petalPalettes[Math.floor(Math.random() * petalPalettes.length)];
    }

    update() {
      this.sway += this.swaySpeed;
      this.flip += this.flipSpeed;
      this.rotation += this.rotSpeed;

      this.y += this.speedY;
      this.x += this.speedX + Math.sin(this.sway) * 0.8;

      if (this.y > height + 40 || this.x > width + 100) {
        this.reset(true);
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(Math.cos(this.flip), 1);
      ctx.globalAlpha = this.opacity;

      ctx.beginPath();
      ctx.moveTo(0, -this.size);
      ctx.bezierCurveTo(this.size * 0.8, -this.size * 0.5, this.size * 0.7, this.size * 0.8, 0, this.size);
      ctx.bezierCurveTo(-this.size * 0.7, this.size * 0.8, -this.size * 0.8, -this.size * 0.5, 0, -this.size);
      ctx.fillStyle = this.color.fill;
      ctx.fill();

      ctx.strokeStyle = this.color.stroke;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.restore();
    }
  }

  class Spark {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = 1 + Math.random() * 2.5;
      this.alpha = 0.1 + Math.random() * 0.7;
      this.speedAlpha = (Math.random() * 0.02 + 0.01) * (Math.random() > 0.5 ? 1 : -1);
      this.speedY = -0.2 - Math.random() * 0.4;
      this.speedX = (Math.random() - 0.5) * 0.4;
    }

    update() {
      this.alpha += this.speedAlpha;
      if (this.alpha > 0.85 || this.alpha < 0.1) {
        this.speedAlpha *= -1;
      }
      this.y += this.speedY;
      this.x += this.speedX;

      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset();
        this.y = height + 10;
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = "#fff4cc";
      ctx.shadowColor = "#fcd34d";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }
  }

  class BurstParticle {
    constructor(x, y, type = "petal") {
      this.x = x;
      this.y = y;
      this.type = type;
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 11;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 2.5;
      this.gravity = 0.16;
      this.friction = 0.96;
      this.alpha = 1;
      this.decay = 0.009 + Math.random() * 0.014;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.12;
      this.size = type === "heart" ? 20 + Math.random() * 10 : 12 + Math.random() * 16;
      this.color = petalPalettes[Math.floor(Math.random() * petalPalettes.length)];
    }

    update() {
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.rotation += this.rotSpeed;
      this.alpha -= this.decay;
    }

    draw() {
      if (this.alpha <= 0) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = this.alpha;

      if (this.type === "heart") {
        ctx.font = `${this.size}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("💖", 0, 0);
      } else if (this.type === "spark") {
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd166";
        ctx.shadowColor = "#fca311";
        ctx.shadowBlur = 12;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.bezierCurveTo(this.size * 0.8, -this.size * 0.5, this.size * 0.7, this.size * 0.8, 0, this.size);
        ctx.bezierCurveTo(-this.size * 0.7, this.size * 0.8, -this.size * 0.8, -this.size * 0.5, 0, -this.size);
        ctx.fillStyle = this.color.fill;
        ctx.fill();
        ctx.strokeStyle = this.color.stroke;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // Khởi tạo hạt ban đầu
  const totalPetals = window.innerWidth < 768 ? 30 : 50;
  for (let i = 0; i < totalPetals; i++) {
    petals.push(new Petal(false));
  }
  for (let i = 0; i < 35; i++) {
    sparks.push(new Spark());
  }

  function triggerPetalBurst(originX, originY, count = 60, includeHearts = false) {
    for (let i = 0; i < count; i++) {
      const type = includeHearts && Math.random() < 0.4 ? "heart" : Math.random() < 0.2 ? "spark" : "petal";
      burstParticles.push(new BurstParticle(originX, originY, type));
    }
  }

  function animateCanvas() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < sparks.length; i++) {
      sparks[i].update();
      sparks[i].draw();
    }

    for (let i = 0; i < petals.length; i++) {
      petals[i].update();
      petals[i].draw();
    }

    for (let i = burstParticles.length - 1; i >= 0; i--) {
      burstParticles[i].update();
      burstParticles[i].draw();
      if (burstParticles[i].alpha <= 0) {
        burstParticles.splice(i, 1);
      }
    }

    requestAnimationFrame(animateCanvas);
  }
  requestAnimationFrame(animateCanvas);

 // Tải trước 6 ảnh hoa để khi bấm không bị trễ nhịp hiện ảnh
  flowerImages.forEach((src) => {
    const preloadImg = new Image();
    preloadImg.src = src;
  });

  // ==========================================================================
  // 2. HIỆU ỨNG HOA MỌC LAN DẦN KÍN HẾT MÀN HÌNH (GIAI ĐOẠN 1)
  // ==========================================================================
  function triggerFullscreenBloomWave(originX, originY, onComplete) {
    if (!bloomSpreadOverlay) {
      if (onComplete) onComplete();
      return;
    }

    bloomSpreadOverlay.innerHTML = "";
    bloomSpreadOverlay.classList.remove("is-fading-out", "is-active");

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Khoảng cách bước lưới chặt để không lộ bất kỳ khe hở nào
    const stepX = vw < 768 ? 58 : 84;
    const stepY = vw < 768 ? 52 : 74;

    const cols = Math.ceil(vw / stepX) + 2;
    const rows = Math.ceil(vh / stepY) + 2;
    const maxDist = Math.hypot(vw, vh);

    const flowerNodes = [];

    for (let r = -1; r < rows; r++) {
      // Dịch so le hàng lẻ theo hình tổ ong để hoa lấp vào đúng khe của hàng trên
      const rowOffset = (r % 2 !== 0) ? stepX * 0.5 : 0;

      for (let c = -1; c < cols; c++) {
        const jitterX = (Math.random() - 0.5) * (stepX * 0.28);
        const jitterY = (Math.random() - 0.5) * (stepY * 0.28);

        const posX = c * stepX + rowOffset + jitterX;
        const posY = r * stepY + jitterY;

        const dist = Math.hypot(posX - originX, posY - originY);
        // Cộng thêm độ nhiễu nhỏ để thứ tự mọc tự nhiên nhưng vẫn lan từ tâm ra ngoài
        const sortKey = dist + (Math.random() - 0.5) * stepX * 0.9;

        flowerNodes.push({ posX, posY, dist, sortKey });
      }
    }

    // Sắp xếp để hoa mọc lần lượt từ vị trí bấm lan dần ra lấp kín toàn trang
    flowerNodes.sort((a, b) => a.sortKey - b.sortKey);

    const totalNodes = flowerNodes.length;
    const totalSpreadDuration = 3.4; // Tổng thời gian hoa mọc lần lượt lấp đầy trang (giây)
    const singleBloomDuration = 0.65; // Thời gian 1 bông hoa bung nở hoàn toàn (giây)
    const fragment = document.createDocumentFragment();

    flowerNodes.forEach((node, idx) => {
      const item = document.createElement("div");
      item.className = "wave-flower-item";

      // Kết hợp tỷ lệ thứ tự (idx) và khoảng cách (dist) để hoa mọc đều từng chỗ một
      const indexRatio = idx / Math.max(1, totalNodes - 1);
      const distRatio = Math.min(1, node.dist / maxDist);
      const delay = (indexRatio * 0.65 + distRatio * 0.35) * totalSpreadDuration;

      // Kích thước mỗi bông lớn hơn khoảng cách lưới (~2.1 lần) để đè kín mọi khe hở
      const baseSize = vw < 768 ? 125 : 175;
      const size = Math.floor(baseSize + Math.random() * 45) + "px";
      const rot = (Math.random() * 70 - 35).toFixed(0) + "deg";
      const targetScale = (1.05 + Math.random() * 0.3).toFixed(2);

      item.style.left = `${node.posX.toFixed(1)}px`;
      item.style.top = `${node.posY.toFixed(1)}px`;
      item.style.setProperty("--delay", `${delay.toFixed(2)}s`);
      item.style.setProperty("--bloom-dur", `${singleBloomDuration}s`);
      item.style.setProperty("--size", size);
      item.style.setProperty("--rot", rot);
      item.style.setProperty("--target-scale", targetScale);

      const imgPath = flowerImages[idx % flowerImages.length];
      item.innerHTML = `<img src="${imgPath}" alt="Hoa nở" />`;
      fragment.appendChild(item);
    });

    bloomSpreadOverlay.appendChild(fragment);

    // Ép trình duyệt nhận trạng thái ban đầu trước khi kích hoạt animation
    void bloomSpreadOverlay.offsetWidth;
    bloomSpreadOverlay.classList.add("is-active");

    // Đợi đến khi bông hoa cuối cùng nở xong (lấp kín 100% màn hình) rồi mới chuyển sang trang kế tiếp
    const fullCoverTimeMs = Math.ceil((totalSpreadDuration + singleBloomDuration + 0.15) * 1000);

    setTimeout(() => {
      // Chuyển sang giao diện trang kế tiếp ngay phía dưới lớp hoa đang phủ kín
      if (onComplete) onComplete();

      // Sau khi trang mới đã sẵn sàng bên dưới, làm mờ dần lớp hoa phủ để lộ trang mới
      setTimeout(() => {
        bloomSpreadOverlay.classList.add("is-fading-out");

        setTimeout(() => {
          bloomSpreadOverlay.classList.remove("is-active", "is-fading-out");
          bloomSpreadOverlay.innerHTML = "";
        }, 1150);
      }, 250);
    }, fullCoverTimeMs);
  }

  // ==========================================================================
  // 3. KHUNG HOA VIỀN VĨNH CỬU BỐ CỤC CHUẨN XÁC (KHÔNG LỆCH, KHÔNG CHE THƯ)
  // ==========================================================================
  // ==========================================================================
  // 3. KHUNG HOA VIỀN VĨNH CỬU BỐ CỤC CHUẨN XÁC (FIX LỖI GÃY THÂN HOA)
  // ==========================================================================
  function buildFullscreenGarden() {
    if (!fullscreenGarden) return;
    fullscreenGarden.innerHTML = "";

    const vw = window.innerWidth;

    // Hàm phụ trợ: Tạo ra một "nhành hoa nguyên khối" (thân và hoa dính liền không bị gãy)
    function plantBranch(config) {
      const node = document.createElement("div");
      node.className = "garden-flower-node";

      // Vị trí mọc (Tọa độ bám tường)
      if (config.left !== undefined) node.style.left = config.left;
      if (config.right !== undefined) node.style.right = config.right;
      if (config.top !== undefined) node.style.top = config.top;
      if (config.bottom !== undefined) node.style.bottom = config.bottom;

      // Kích thước và góc xoay
      node.style.setProperty("--stem-h", config.stemH || "90px");
      node.style.setProperty("--flower-size", config.size || "75px");
      node.style.setProperty("--flower-scale", config.scale || "1");
      
      // QUAN TRỌNG: Xoay toàn bộ node để thân và hoa luôn đi cùng 1 hướng
      node.style.setProperty("--flower-rot", config.rot || "0deg");
      node.style.setProperty("--bloom-delay", config.delay || "0s");
      node.style.setProperty("--sway-dur", config.swayDur || "4.5s");

      const leafHtml = config.hasLeaf 
        ? `<div class="node-leaf ${config.leafClass || ''}"></div>` 
        : '';

      // Thân cây không được dùng style="transform: rotate..." để tránh lệch khỏi hoa
      node.innerHTML = `
        <div class="node-stem"></div>
        ${leafHtml}
        <img class="node-blossom-img" src="${config.img}" alt="Hoa viền" loading="lazy" />
      `;
      fullscreenGarden.appendChild(node);
    }

    // 1. THẢM HOA ĐÁY (Mọc từ dưới lên)
    const bottomCount = vw < 768 ? 4 : 6; // Chừa trống ở giữa nhiều hơn cho bức thư
    
    // Đáy bên TRÁI
    for (let i = 0; i < bottomCount; i++) {
      const spreadX = 26; // Dàn trải từ 0% đến 26%
      const posX = (i / Math.max(1, bottomCount - 1)) * spreadX + (Math.random() * 3 - 1.5);
      
      plantBranch({
        left: `${posX}%`,
        bottom: "-10px", // Đẩy cắm sâu xuống đất một chút
        stemH: Math.floor(65 + Math.random() * 70) + "px",
        size: Math.floor(65 + Math.random() * 35) + "px",
        scale: (0.85 + Math.random() * 0.3).toFixed(2),
        rot: (Math.random() * 24 - 12).toFixed(1) + "deg", // Nghiêng nhẹ trái phải (-12 -> 12 độ)
        delay: (0.2 + i * 0.1).toFixed(2) + "s",
        swayDur: (3.5 + Math.random() * 3).toFixed(1) + "s",
        hasLeaf: true,
        img: flowerImages[i % flowerImages.length]
      });
    }

    // Đáy bên PHẢI
    for (let i = 0; i < bottomCount; i++) {
      const spreadX = 26; // Dàn trải từ 74% đến 100%
      const posX = (i / Math.max(1, bottomCount - 1)) * spreadX + (Math.random() * 3 - 1.5);
      
      plantBranch({
        right: `${posX}%`,
        bottom: "-10px",
        stemH: Math.floor(65 + Math.random() * 70) + "px",
        size: Math.floor(65 + Math.random() * 35) + "px",
        scale: (0.85 + Math.random() * 0.3).toFixed(2),
        rot: (Math.random() * 24 - 12).toFixed(1) + "deg",
        delay: (0.25 + i * 0.1).toFixed(2) + "s",
        swayDur: (3.5 + Math.random() * 3).toFixed(1) + "s",
        hasLeaf: true,
        leafClass: "leaf-right",
        img: flowerImages[(i + 3) % flowerImages.length]
      });
    }

    // 2. CÁC CÀNH VƯƠN TỪ MÉP TƯỜNG BÊN TRÁI (Nằm ngang vươn ra phải)
    const sideBranches = vw < 768 ? 3 : 5;
    for (let i = 0; i < sideBranches; i++) {
      const posY = 15 + (i / sideBranches) * 65 + (Math.random() * 10 - 5);
      plantBranch({
        left: "-15px", // Gắn chặt vào tường trái
        top: `${posY}%`,
        stemH: Math.floor(55 + Math.random() * 35) + "px",
        size: Math.floor(60 + Math.random() * 20) + "px",
        scale: (0.8 + Math.random() * 0.25).toFixed(2),
        // Xoay toàn bộ gốc 90 độ để nó chĩa ngang từ trái qua phải, sau đó lắc nhẹ +-25 độ
        rot: (90 + Math.random() * 50 - 25).toFixed(1) + "deg", 
        delay: (0.3 + i * 0.12).toFixed(2) + "s",
        swayDur: (4 + Math.random() * 2).toFixed(1) + "s",
        hasLeaf: false, // Bỏ lá cho các cành treo tường
        img: flowerImages[(i * 2 + 1) % flowerImages.length]
      });
    }

    // 3. CÁC CÀNH VƯƠN TỪ MÉP TƯỜNG BÊN PHẢI (Nằm ngang vươn ra trái)
    for (let i = 0; i < sideBranches; i++) {
      const posY = 18 + (i / sideBranches) * 60 + (Math.random() * 10 - 5);
      plantBranch({
        right: "-15px", // Gắn chặt vào tường phải
        top: `${posY}%`,
        stemH: Math.floor(55 + Math.random() * 35) + "px",
        size: Math.floor(60 + Math.random() * 20) + "px",
        scale: (0.8 + Math.random() * 0.25).toFixed(2),
        // Xoay toàn bộ gốc -90 độ để nó chĩa ngang từ phải qua trái, lắc nhẹ +-25 độ
        rot: (-90 + Math.random() * 50 - 25).toFixed(1) + "deg", 
        delay: (0.35 + i * 0.12).toFixed(2) + "s",
        swayDur: (4 + Math.random() * 2).toFixed(1) + "s",
        hasLeaf: false,
        img: flowerImages[(i * 3 + 2) % flowerImages.length]
      });
    }

    // 4. CÁC CHÙM HOA RỦ TỪ TRẦN NHÀ XUỐNG
    const topGarlands = [
      { pos: { left: "8%" }, baseRot: 145, imgIdx: 0 },
      { pos: { left: "22%" }, baseRot: 165, imgIdx: 1 },
      { pos: { right: "22%" }, baseRot: -165, imgIdx: 3 },
      { pos: { right: "8%" }, baseRot: -145, imgIdx: 4 },
    ];

    topGarlands.forEach((item, idx) => {
      const key = Object.keys(item.pos)[0]; // 'left' hoặc 'right'
      const val = item.pos[key];
      
      const config = {
        top: "-15px", // Gắn lên trần
        stemH: Math.floor(60 + Math.random() * 30) + "px",
        size: Math.floor(65 + Math.random() * 15) + "px",
        scale: "0.9",
        // Xoay ngược xuống (~180 độ)
        rot: (item.baseRot + Math.random() * 20 - 10).toFixed(1) + "deg", 
        delay: (0.4 + idx * 0.1).toFixed(2) + "s",
        swayDur: (4 + Math.random() * 2).toFixed(1) + "s",
        hasLeaf: false,
        img: flowerImages[item.imgIdx]
      };
      config[key] = val; // Gán left/right tự động
      plantBranch(config);
    });
  }
  buildFullscreenGarden();

  // ==========================================================================
  // 4. SPOTLIGHT CAROUSEL: CHẠY TỪNG THẺ TỪ TRÁI SANG PHẢI, THẺ NỔI BẬT HƠN
  // ==========================================================================
  function updateSpotlight(newIndex, animate = true) {
    if (!carouselTrack || totalCards === 0) return;

    currentSpotlightIndex = (newIndex + totalCards) % totalCards;

    // Cập nhật class is-spotlight cho thẻ tương ứng
    cards.forEach((card, idx) => {
      if (idx === currentSpotlightIndex) {
        card.classList.add("is-spotlight");
      } else {
        card.classList.remove("is-spotlight");
      }
    });

    // Cập nhật dots
    if (carouselDotsContainer) {
      const dots = carouselDotsContainer.querySelectorAll(".dot");
      dots.forEach((dot, idx) => {
        if (idx === currentSpotlightIndex) {
          dot.classList.add("is-active");
        } else {
          dot.classList.remove("is-active");
        }
      });
    }

    // Tính toán khoảng trượt để đưa thẻ Spotlight ra chính giữa sân khấu
    const stageWidth = carouselStage ? carouselStage.offsetWidth : 800;
    const cardEl = cards[currentSpotlightIndex];
    if (cardEl) {
      const cardWidth = cardEl.offsetWidth + 24; // card width + margin 12px each side
      // Vị trí để thẻ spotlight nằm ngay trung tâm:
      const targetOffset = stageWidth / 2 - currentSpotlightIndex * cardWidth - cardWidth / 2;
      
      if (animate) {
        carouselTrack.style.transition = "transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)";
      } else {
        carouselTrack.style.transition = "none";
      }
      carouselTrack.style.transform = `translateX(${targetOffset}px)`;
    }
  }

  function startCarouselAutoLoop() {
    stopCarouselAutoLoop();
    carouselAutoTimer = setInterval(() => {
      // Chạy từng thẻ từ TRÁI sang PHẢI (0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 0...)
      updateSpotlight(currentSpotlightIndex + 1);
    }, 2800);
  }

  function stopCarouselAutoLoop() {
    if (carouselAutoTimer) {
      clearInterval(carouselAutoTimer);
      carouselAutoTimer = null;
    }
  }

  // Tương tác click từng thẻ
  cards.forEach((card, idx) => {
    card.addEventListener("click", () => {
      updateSpotlight(idx);
      const rect = card.getBoundingClientRect();
      triggerPetalBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 25, true);
    });
  });

  // Tương tác bấm nút mũi tên
  if (carouselPrevBtn) {
    carouselPrevBtn.addEventListener("click", () => {
      updateSpotlight(currentSpotlightIndex - 1);
    });
  }
  if (carouselNextBtn) {
    carouselNextBtn.addEventListener("click", () => {
      updateSpotlight(currentSpotlightIndex + 1);
    });
  }

  // Tương tác bấm dot
  if (carouselDotsContainer) {
    const dots = carouselDotsContainer.querySelectorAll(".dot");
    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const idx = parseInt(dot.getAttribute("data-dot"), 10);
        if (!isNaN(idx)) {
          updateSpotlight(idx);
        }
      });
    });
  }

  // Dừng auto loop khi rê chuột vào carousel
  if (carouselStage) {
    carouselStage.addEventListener("mouseenter", stopCarouselAutoLoop);
    carouselStage.addEventListener("mouseleave", () => {
      if (isBloomed) startCarouselAutoLoop();
    });
    // Hỗ trợ cảm ứng vuốt trên điện thoại
    let touchStartX = 0;
    carouselStage.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
      stopCarouselAutoLoop();
    }, { passive: true });
    carouselStage.addEventListener("touchend", (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      if (touchStartX - touchEndX > 45) {
        updateSpotlight(currentSpotlightIndex + 1);
      } else if (touchEndX - touchStartX > 45) {
        updateSpotlight(currentSpotlightIndex - 1);
      }
      if (isBloomed) startCarouselAutoLoop();
    }, { passive: true });
  }

  // Khởi tạo vị trí spotlight ban đầu
  setTimeout(() => {
    updateSpotlight(0, false);
  }, 200);

  // ==========================================================================
  // 5. HOẠT CẢNH HOA NỞ RỘ LIỀN MẠCH (KHÔNG CHUYỂN TRANG)
  // ==========================================================================
  function bloomTheGarden() {
    if (isBloomed) return;
    isBloomed = true;

    bloomTriggerBtn.classList.add("is-blooming");

    const rect = bloomTriggerBtn.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height * 0.35;

    // Phóng thích chùm pháo hoa 120 cánh hoa & bụi sáng
    triggerPetalBurst(originX, originY, 120, false);

    startAmbientMelody();

    // KÍCH HOẠT HIỆU ỨNG HOA MỌC LAN DẦN KÍN HẾT MÀN HÌNH
    triggerFullscreenBloomWave(originX, originY, () => {
      // Khi hoa lan kín màn hình, mở ra khu vườn vĩnh cửu và carousel spotlight
      if (fullscreenGarden) {
        fullscreenGarden.classList.add("is-active");
      }

      stage.classList.add("is-bloomed");
      const bloomedUniverse = document.querySelector("#bloomed-universe");
      if (bloomedUniverse) {
        bloomedUniverse.setAttribute("aria-hidden", "false");
      }

      // Cuộn êm ái lên đầu trang
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      // Bắt đầu vòng lặp carousel spotlight từng thẻ từ trái sang phải
      setTimeout(() => {
        updateSpotlight(0);
        startCarouselAutoLoop();
      }, 500);
    });
  }

  if (bloomTriggerBtn) {
    bloomTriggerBtn.addEventListener("click", bloomTheGarden);
  }

  if (burstHeartsBtn) {
    burstHeartsBtn.addEventListener("click", () => {
      const rect = burstHeartsBtn.getBoundingClientRect();
      triggerPetalBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 80, true);

      burstHeartsBtn.style.transform = "scale(0.96)";
      setTimeout(() => {
        burstHeartsBtn.style.transform = "";
      }, 150);
    });
  }

  // ==========================================================================
  // 6. GIAI ĐIỆU DU DƯƠNG 20/10 (WEB AUDIO API TỰ ĐỘNG - 100% OFFLINE)
  // ==========================================================================
  // ==========================================================================
  // 6. GIAI ĐIỆU DU DƯƠNG 20/10 (DÙNG NHẠC TIKTOK MP3)
  // ==========================================================================
  const bgMusic = document.getElementById("bg-music");
  
  // Set âm lượng (từ 0.0 đến 1.0). Bạn có thể chỉnh sửa số này nếu nhạc gốc quá to hoặc nhỏ
  bgMusic.volume = 0.6; 

  function startAmbientMelody() {
    if (isAudioPlaying) return;
    
    // Gọi lệnh play nhạc
    const playPromise = bgMusic.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        isAudioPlaying = true;
        audioWidget.classList.add("is-playing");
        audioStatusText.textContent = "Đang phát";
      }).catch(error => {
        console.log("Trình duyệt chặn tự động phát nhạc:", error);
      });
    }
  }

  function stopAmbientMelody() {
    if (!isAudioPlaying) return;
    
    bgMusic.pause();
    isAudioPlaying = false;
    audioWidget.classList.remove("is-playing");
    audioStatusText.textContent = "Tắt nhạc";
  }

  if (audioToggleBtn) {
    audioToggleBtn.addEventListener("click", () => {
      if (isAudioPlaying) {
        stopAmbientMelody();
      } else {
        startAmbientMelody();
      }
    });
  }
})();