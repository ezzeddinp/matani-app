import csv
from datetime import date
from pathlib import Path
import sys
from reportlab import rl_config
from reportlab.graphics.shapes import Drawing, String
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.widgets.markers import makeMarker
from reportlab.graphics import renderPDF
from reportlab.lib.colors import HexColor

rl_config.invariant = 1
root = Path(sys.argv[1])
rows = list(csv.DictReader((root/'daily-pixels.csv').open()))
drawing = Drawing(720, 360)
drawing.add(String(30, 335, 'Passing observation dates: original and 10 m buffer', fontName='Helvetica-Bold', fontSize=15))
plot = LinePlot()
plot.x, plot.y, plot.width, plot.height = 65, 85, 615, 210
plot.joinedLines = 0
plot.data = []
labels = ['Original NDVI', 'Original NDMI', 'Buffered NDVI', 'Buffered NDMI']
for level, (geometry, index) in enumerate([('original','ndvi'),('original','ndmi'),('buffered','ndvi'),('buffered','ndmi')], 1):
    plot.data.append([((date.fromisoformat(r['day'])-date(2021,1,1)).days, level) for r in rows if r['geometry']==geometry and r['index']==index and r['passes']=='True'])
    plot.lines[level-1].symbol = makeMarker('FilledCircle', size=5, fillColor=HexColor('#126B56'), strokeColor=HexColor('#126B56'))
plot.xValueAxis.valueMin, plot.xValueAxis.valueMax = 0, 364
plot.xValueAxis.valueSteps = [(date(2021,m,1)-date(2021,1,1)).days for m in range(1,13)]
months = dict(zip(plot.xValueAxis.valueSteps,['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']))
plot.xValueAxis.labelTextFormat = lambda value: months.get(value,'')
plot.yValueAxis.valueMin, plot.yValueAxis.valueMax = 0.5, 4.5
plot.yValueAxis.valueSteps = [1,2,3,4]
plot.yValueAxis.labelTextFormat = lambda value: str(int(value))
drawing.add(plot)
drawing.add(String(65, 48, '1 Original NDVI    2 Original NDMI    3 Buffered NDVI    4 Buffered NDMI',fontSize=10))
drawing.add(String(65, 29, '23 passing dates per row; both delivery policies coincide. No interpolation.',fontSize=10))
drawing.add(String(65, 12, 'Krangkeng mapped block, 2021. Dots indicate passing observations, not crop-health accuracy.',fontSize=9))
renderPDF.drawToFile(drawing, str(root/'observation-timeline.pdf'))
