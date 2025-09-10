import { Engine } from "@/engine/engine";
import { Renderer } from "@/engine/renderer";
import { useEffect, useState } from "preact/hooks";

interface Props {
    engine: Engine;
}

export function EditorUI(props: Props) {
    return <Metrics renderer={props.engine.renderer} />;
}

function Metrics({ renderer }: { renderer: Renderer }) {
    const [metrics, setMetrics] = useState(renderer.getMetrics());

    useEffect(() => {
        let rafId: number;

        const loop = () => {
            setMetrics({ ...renderer.getMetrics() });
            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [renderer]);

    return (
        <div class="text-white font-mono inline-block p-4 m-2">
            <p>Metrics:</p>
            {Object.entries(metrics).map(([key, val]) => {
                return (
                    <span key={key} class="block text-gray-300 text-xs">
                        <span class="font-bold">{key}</span>:{" "}
                        {formatNumber(Number(val), 4)}
                    </span>
                );
            })}
        </div>
    );
}

function formatNumber(n: number, decimals: number = 5) {
    const rounded = Math.round(n * 10 ** decimals) / 10 ** decimals;
    return rounded === Math.floor(rounded) ? rounded : rounded.toString();
}
