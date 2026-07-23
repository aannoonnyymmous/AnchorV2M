const horizontalRoot = document.querySelector("#horizontal-samples");
const verticalRoot = document.querySelector("#vertical-samples");
const tabs = [...document.querySelectorAll("[data-category]")];
const previousButton = document.querySelector("#previous-page");
const nextButton = document.querySelector("#next-page");
const pageStatus = document.querySelector("#page-status");

let sampleData;
let activeCategory = "MV";
const pageByCategory = { MV: 0, BV: 0 };
const pageByMetric = {};

function mediaCard(item, badge) {
  const card = document.createElement("article");
  card.className = "media-card";

  const video = document.createElement("video");
  video.controls = true;
  video.preload = "metadata";
  video.playsInline = true;
  video.src = item.src;
  video.setAttribute("aria-label", item.label);

  const label = document.createElement("div");
  label.className = "media-label";
  const name = document.createElement("span");
  name.textContent = item.label;
  label.append(name);

  if (badge) {
    const marker = document.createElement("span");
    marker.className = "badge";
    marker.textContent = badge;
    label.append(marker);
  }

  card.append(video, label);
  return card;
}

function titleBlock(title, id) {
  const header = document.createElement("header");
  header.className = "sample-title";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const code = document.createElement("span");
  code.className = "sample-id";
  code.textContent = id;
  header.append(heading, code);
  return header;
}

function renderHorizontal() {
  horizontalRoot.replaceChildren();
  const samples = sampleData.horizontal.filter((sample) => sample.category === activeCategory);
  const pageIndex = Math.min(pageByCategory[activeCategory], samples.length - 1);
  pageByCategory[activeCategory] = Math.max(pageIndex, 0);
  const sample = samples[pageByCategory[activeCategory]];

  if (!sample) return;

  const group = document.createElement("article");
  group.className = "sample-group";
  group.id = `${activeCategory.toLowerCase()}-${sample.id}`;
  group.append(titleBlock(sample.title || `${activeCategory} example ${pageIndex + 1}`, sample.id));

  const grid = document.createElement("div");
  grid.className = "media-grid";
  sample.methods.forEach((method) => {
    const badge = method.featured ? "Ours" : "";
    grid.append(mediaCard(method, badge));
  });
  group.append(grid);
  horizontalRoot.append(group);

  pageStatus.textContent = `${pageIndex + 1} / ${samples.length}`;
  previousButton.disabled = pageIndex === 0;
  nextButton.disabled = pageIndex === samples.length - 1;
}

function renderVertical() {
  verticalRoot.replaceChildren();
  sampleData.vertical.forEach((metric) => {
    const section = document.createElement("section");
    section.className = "metric";
    const heading = document.createElement("h3");
    heading.className = "metric-heading";
    heading.textContent = metric.label;
    section.append(heading);
    if (metric.description) {
      const description = document.createElement("p");
      description.className = "metric-description";
      description.textContent = metric.description;
      section.append(description);
    }

    const viewport = document.createElement("div");
    viewport.className = "metric-viewport";
    const pagination = document.createElement("nav");
    pagination.className = "pagination metric-pagination";
    pagination.setAttribute("aria-label", `${metric.label} pages`);
    const previous = document.createElement("button");
    previous.className = "page-button";
    previous.type = "button";
    previous.textContent = "← Previous";
    const status = document.createElement("span");
    status.className = "page-status";
    status.setAttribute("aria-live", "polite");
    const next = document.createElement("button");
    next.className = "page-button page-button-primary";
    next.type = "button";
    next.textContent = "Next →";
    pagination.append(previous, status, next);
    section.append(viewport, pagination);

    pageByMetric[metric.label] ??= 0;
    const pageCount = Math.ceil(metric.examples.length / 2);

    const updatePage = () => {
      const pageIndex = pageByMetric[metric.label];
      const pageExamples = metric.examples.slice(pageIndex * 2, pageIndex * 2 + 2);
      const page = document.createElement("div");
      page.className = "metric-page";

      pageExamples.forEach((example, index) => {
        const pair = document.createElement("article");
        pair.className = "pair";
        pair.append(titleBlock(example.title || `Example ${pageIndex * 2 + index + 1}`, example.id));

        const grid = document.createElement("div");
        grid.className = "media-grid";
        grid.append(
          mediaCard({ label: "High", src: example.high }, "High"),
          mediaCard({ label: "Low", src: example.low }, "Low"),
        );
        pair.append(grid);
        page.append(pair);
      });

      viewport.replaceChildren(page);
      status.textContent = `${pageIndex + 1} / ${pageCount}`;
      previous.disabled = pageIndex === 0;
      next.disabled = pageIndex === pageCount - 1;
    };

    const changePage = (direction) => {
      const nextPage = pageByMetric[metric.label] + direction;
      if (nextPage < 0 || nextPage >= pageCount) return;
      pageByMetric[metric.label] = nextPage;
      updatePage();
    };

    previous.addEventListener("click", () => changePage(-1));
    next.addEventListener("click", () => changePage(1));

    let touchStartX = 0;
    viewport.addEventListener("touchstart", (event) => {
      touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    viewport.addEventListener("touchend", (event) => {
      const distance = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(distance) < 55) return;
      changePage(distance < 0 ? 1 : -1);
    }, { passive: true });

    updatePage();
    verticalRoot.append(section);
  });
}

function pauseOtherVideos(event) {
  if (event.target.tagName !== "VIDEO") return;
  document.querySelectorAll("video").forEach((video) => {
    if (video !== event.target) video.pause();
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeCategory = tab.dataset.category;
    tabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    renderHorizontal();
  });
});

previousButton.addEventListener("click", () => {
  pageByCategory[activeCategory] -= 1;
  renderHorizontal();
  document.querySelector("#horizontal").scrollIntoView({ behavior: "smooth" });
});

nextButton.addEventListener("click", () => {
  pageByCategory[activeCategory] += 1;
  renderHorizontal();
  document.querySelector("#horizontal").scrollIntoView({ behavior: "smooth" });
});

document.addEventListener("play", pauseOtherVideos, true);

fetch("samples.json")
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((data) => {
    sampleData = data;
    renderHorizontal();
    renderVertical();
  })
  .catch((error) => {
    console.error("Unable to load samples", error);
    const notice = document.querySelector("#error-template").content.cloneNode(true);
    horizontalRoot.replaceChildren(notice);
  });
