import {render} from 'preact';
import './style.css';
import {Forma} from "forma-embedded-view-sdk/auto";
import {useState, useEffect} from "preact/hooks";
import * as XLSX from 'xlsx';

const DEFAULT_COLOR = {
    r: 0,
    g: 255,
    b: 255,
    a: 1.0,
};

function App() {
    const [buildingPaths, setBuildingPaths] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState<string>(""); 
    const [buildingData, setBuildingData] = useState<{ name: string, path: string, areaMetrics: any }[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            Forma.geometry
                .getPathsByCategory({category: "building"})
                .then(setBuildingPaths);
        };
        fetchData();
    }, []);

    const calculateAreaMetrics = async () => {
        const selectedPaths = await Forma.selection.getSelection();

        for (let path of selectedPaths) {
            if (buildingPaths.includes(path)) {
                const projectMetadata = await Forma.project.get()
                const areaMetrics = await Forma.areaMetrics.calculate({ paths: [path] });
                console.log(JSON.stringify(projectMetadata))
                // Add the building name and area metrics to the buildingData state variable
                setBuildingData(prevData => [...prevData, { name: inputValue, path, areaMetrics }]);
            }
        }
    };

    // Process the responses when the button is clicked
    const processResponses = () => {
        let wb = XLSX.utils.book_new();
    
        for (let building of buildingData) {
            for (let metric in building.areaMetrics.builtInMetrics) {
                if (Array.isArray(building.areaMetrics.builtInMetrics[metric].functionBreakdown)) {
                    let data = building.areaMetrics.builtInMetrics[metric].functionBreakdown.map(item => ({
                        ...item,
                        buildingId: building.path.split("/").pop()
                    }));
                    let ws = XLSX.utils.json_to_sheet(data);
                    XLSX.utils.book_append_sheet(wb, ws, building.name);
                }
            }
        }
    
        XLSX.writeFile(wb, `FormaBGFData.xlsx`);
        console.log(buildingData);
        setBuildingData([]);
    };

    return (
        <>
            <div class="section">
                <p>This Extension calculates the "Area Metrics" for a selected building and downloads the results into an excel workbook</p>
            </div>
            <div class="section">
                <input type="text" placeholder="Enter the building name" value={inputValue} onChange={(e) => setInputValue((e.target as HTMLInputElement).value)} />
                <button onClick={() => { calculateAreaMetrics(); setInputValue(''); }} disabled={!buildingPaths}>Calculate BGF</button>
            </div>
            <div class="section">
            <button onClick={processResponses} disabled={!buildingPaths}>Download</button>
        </div>
        </>
    );
}

render(<App/>, document.getElementById('app'));