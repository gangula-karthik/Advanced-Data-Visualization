export function Legend(color, {
    title,
    tickSize = 6,
    width = 320,
    height = 44 + tickSize,
    marginTop = 18,
    marginRight = 0,
    marginBottom = 16 + tickSize,
    marginLeft = 0,
    ticks = width / 64,
    tickFormat,
    tickValues
} = {}) {

    function ramp(color, n = 256) {
        const canvas = document.createElement("canvas");
        canvas.width = n;
        canvas.height = 1;
        const context = canvas.getContext("2d");
        for (let i = 0; i < n; ++i) {
            context.fillStyle = color(i / (n - 1));
            context.fillRect(i, 0, 1, 1);
        }
        return canvas;
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.style.overflow = "visible";
    svg.style.display = "block";

    let tickAdjust = g => g.querySelectorAll(".tick line").forEach(line => {
        line.setAttribute("y1", marginTop + marginBottom - height);
    });
    let x;

    // Continuous
    if (color.interpolate) {
        const n = Math.min(color.domain().length, color.range().length);

        x = color.copy().range(d3.quantize(d3.interpolate(marginLeft, width - marginRight), n));

        const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        image.setAttribute("x", marginLeft);
        image.setAttribute("y", marginTop);
        image.setAttribute("width", width - marginLeft - marginRight);
        image.setAttribute("height", height - marginTop - marginBottom);
        image.setAttribute("preserveAspectRatio", "none");
        image.setAttribute("xlink:href", ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL());
        svg.appendChild(image);
    }

    // Sequential
    else if (color.interpolator) {
        x = Object.assign(color.copy()
            .interpolator(d3.interpolateRound(marginLeft, width - marginRight)), {
            range() {
                return [marginLeft, width - marginRight];
            }
        });

        const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        image.setAttribute("x", marginLeft);
        image.setAttribute("y", marginTop);
        image.setAttribute("width", width - marginLeft - marginRight);
        image.setAttribute("height", height - marginTop - marginBottom);
        image.setAttribute("preserveAspectRatio", "none");
        image.setAttribute("xlink:href", ramp(color.interpolator()).toDataURL());
        svg.appendChild(image);

        if (!x.ticks) {
            if (tickValues === undefined) {
                const n = Math.round(ticks + 1);
                tickValues = Array.from({ length: n }, (_, i) => d3.quantile(color.domain(), i / (n - 1)));
            }
            if (typeof tickFormat !== "function") {
                tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
            }
        }
    }

    // Threshold
    else if (color.invertExtent) {
        const thresholds = color.thresholds
            ? color.thresholds()
            : color.quantiles
                ? color.quantiles()
                : color.domain();

        const thresholdFormat = tickFormat === undefined
            ? d => d
            : typeof tickFormat === "string"
                ? d3.format(tickFormat)
                : tickFormat;

        x = d3.scaleLinear()
            .domain([-1, color.range().length - 1])
            .range([marginLeft, width - marginRight]);

        thresholds.forEach((_, i) => {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", x(i - 1));
            rect.setAttribute("y", marginTop);
            rect.setAttribute("width", x(i) - x(i - 1));
            rect.setAttribute("height", height - marginTop - marginBottom);
            rect.setAttribute("fill", color.range()[i]);
            svg.appendChild(rect);
        });

        tickValues = Array.from({ length: thresholds.length }, (_, i) => i);
        tickFormat = i => thresholdFormat(thresholds[i], i);
    }

    // Ordinal
    else {
        x = d3.scaleBand()
            .domain(color.domain())
            .range([marginLeft, width - marginRight]);

        color.domain().forEach(domain => {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", x(domain));
            rect.setAttribute("y", marginTop);
            rect.setAttribute("width", Math.max(0, x.bandwidth() - 1));
            rect.setAttribute("height", height - marginTop - marginBottom);
            rect.setAttribute("fill", color(domain));
            svg.appendChild(rect);
        });

        tickAdjust = () => { };
    }

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(0,${height - marginBottom})`);
    svg.appendChild(g);

    return svg;
}