import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Play, Pause, RotateCcw, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const FryerSimulation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [systemType, setSystemType] = useState('actual');
  const [productionData, setProductionData] = useState([]);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [totals, setTotals] = useState({
    oilUsed: 0,
    oilLost: 0,
    productLoss: 0,
    revenue: 0,
    costs: 0
  });

  const [evaluatedProducts, setEvaluatedProducts] = useState([]);

  // Configuración de productos con frecuencias reales
  const [products, setProducts] = useState([
    { 
      name: 'Sopaipillas', 
      time: 120, 
      temp: 175, 
      units: 16100, 
      batchesPerDay: 1,
      frequency: 'variable',
      daysPerWeek: 2.5,
      active: true
    },
    { 
      name: 'Empanaditas', 
      time: 180, 
      temp: 180, 
      units: 7500,
      batchesPerDay: 1,
      frequency: 'weekly',
      daysPerWeek: 3,
      active: true
    },
    { 
      name: 'Camarones Apanados', 
      time: 240, 
      temp: 185, 
      units: 100,
      batchesPerDay: 1,
      frequency: 'biweekly',
      daysPerMonth: 2,
      active: false
    },
    { 
      name: 'Bolitas de Carne', 
      time: 200, 
      temp: 182, 
      units: 1250,
      batchesPerDay: 1,
      frequency: 'monthly',
      daysPerMonth: 1,
      active: false
    }
  ]);

  const updateProduct = (index, field, value) => {
    const newProducts = [...products];
    newProducts[index][field] = parseFloat(value) || 0;
    setProducts(newProducts);
  };

  // Configuración de sistemas
  const systems = {
    actual: {
      name: 'ATFS-75 (Gas)',
      capacity: 34,
      tempVariation: 15,
      oilLossRate: 0.30,
      productLossRate: 0.008,
      efficiency: 0.65,
      filterSystem: false
    },
    nuevo: {
      name: 'Western Kitchen 40L',
      capacity: 40,
      tempVariation: 2,
      oilLossRate: 0.15,
      productLossRate: 0.004,
      efficiency: 0.82,
      filterSystem: true
    }
  };

  const currentSystem = systems[systemType];

  // Determinar qué productos se producen en un día específico
  const getProductsForDay = (dayNumber) => {
    const productsToday = [];
    
    products.forEach(product => {
      let shouldProduce = false;
      
      switch(product.frequency) {
        case 'variable':
          const weekDay = dayNumber % 7;
          shouldProduce = [1, 3, 5].includes(weekDay) || (Math.random() < 0.3 && [2, 4].includes(weekDay));
          break;
          
        case 'weekly':
          const weekDay2 = dayNumber % 7;
          shouldProduce = [2, 4, 6].includes(weekDay2);
          break;
          
        case 'biweekly':
          shouldProduce = dayNumber % 14 === 0;
          break;
          
        case 'monthly':
          shouldProduce = dayNumber === 15;
          break;
          
        default:
          shouldProduce = true;
      }
      
      if (shouldProduce) {
        productsToday.push(product);
      }
    });
    
    return productsToday;
  };

  // Simular un lote de producción
  const simulateBatch = (product, system) => {
    const tempActual = product.temp + (Math.random() - 0.5) * 2 * system.tempVariation;
    const tempInRange = Math.abs(tempActual - product.temp) < 5;
    
    const oilUsedPerBatch = system.capacity;
    const oilLostPerBatch = oilUsedPerBatch * (system.oilLossRate / 30);
    const productLossPerBatch = (product.units / product.batchesPerDay) * system.productLossRate * (tempInRange ? 1 : 1.5);
    
    return {
      product: product.name,
      temperature: tempActual,
      targetTemp: product.temp,
      tempInRange,
      oilUsed: oilUsedPerBatch,
      oilLost: oilLostPerBatch,
      productLoss: productLossPerBatch,
      efficiency: system.efficiency,
      time: product.time,
      units: product.units / product.batchesPerDay
    };
  };

  // Simular día de producción
  const simulateDay = () => {
    if (currentDay >= 30) return;

    let dayData = {
      day: currentDay + 1,
      oilUsed: 0,
      oilLost: 0,
      productLoss: 0,
      revenue: 0,
      costs: 0,
      batches: [],
      totalBatches: 0
    };

    const evaluatedSet = new Set();
    const todaysProducts = getProductsForDay(currentDay + 1);

    if (todaysProducts.length > 0) {
      const dailyOilCapacity = currentSystem.capacity;
      dayData.oilUsed = dailyOilCapacity;

      todaysProducts.forEach(product => {
        const batchesPerDay = product.batchesPerDay;
        dayData.totalBatches += batchesPerDay;
        
        for (let i = 0; i < batchesPerDay; i++) {
          const batch = simulateBatch(product, currentSystem);
          dayData.batches.push(batch);
          dayData.oilLost += batch.oilLost;
          dayData.productLoss += batch.productLoss;
          evaluatedSet.add(product.name);
        }
      });
    }

    const revenuePerDay = 21466428 / 30;
    dayData.revenue = revenuePerDay;
    dayData.costs = (dayData.oilLost * 1750) + (dayData.productLoss * 100);

    setProductionData(prev => [...prev, dayData]);
    setCurrentDay(prev => prev + 1);
    
    setTotals(prev => ({
      oilUsed: prev.oilUsed + dayData.oilUsed,
      oilLost: prev.oilLost + dayData.oilLost,
      productLoss: prev.productLoss + dayData.productLoss,
      revenue: prev.revenue + dayData.revenue,
      costs: prev.costs + dayData.costs
    }));

    setEvaluatedProducts(Array.from(evaluatedSet));

    if (dayData.batches.length > 0) {
      setCurrentBatch({
        ...dayData.batches[dayData.batches.length - 1],
        batchNumber: dayData.batches.length,
        totalBatches: dayData.totalBatches
      });
    } else {
      setCurrentBatch(null);
    }
  };

  useEffect(() => {
    let interval;
    if (isRunning && currentDay < 30) {
      interval = setInterval(() => {
        simulateDay();
      }, 500);
    } else if (currentDay >= 30) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, currentDay, systemType, products]);

  const resetSimulation = () => {
    setIsRunning(false);
    setCurrentDay(0);
    setProductionData([]);
    setCurrentBatch(null);
    setEvaluatedProducts([]);
    setTotals({
      oilUsed: 0,
      oilLost: 0,
      productLoss: 0,
      revenue: 0,
      costs: 0
    });
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const comparisonData = [
    {
      metric: 'Pérdida de Aceite',
      actual: 546,
      nuevo: 273,
      unit: 'L/mes'
    },
    {
      metric: 'Costo Aceite',
      actual: 955500,
      nuevo: 477750,
      unit: 'CLP/mes'
    },
    {
      metric: 'Merma Producto',
      actual: 0.8,
      nuevo: 0.4,
      unit: '%'
    },
    {
      metric: 'Variación Temp.',
      actual: 15,
      nuevo: 2,
      unit: '°C'
    }
  ];

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Simulación Sistema de Fritura - Salvia S.A.
          </h1>
          <p className="text-slate-600">
            Comparación entre sistema actual (ATFS-75) y sistema propuesto (Western Kitchen 40L)
          </p>
        </div>

        {/* Controles */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  isRunning
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                disabled={currentDay >= 30}
              >
                {isRunning ? <Pause size={20} /> : <Play size={20} />}
                {isRunning ? 'Pausar' : 'Iniciar'}
              </button>
              <button
                onClick={resetSimulation}
                className="flex items-center gap-2 px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-medium transition"
              >
                <RotateCcw size={20} />
                Reiniciar
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSystemType('actual');
                  resetSimulation();
                }}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  systemType === 'actual'
                    ? 'bg-green-500 text-black'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Sistema Actual
              </button>
              <button
                onClick={() => {
                  setSystemType('nuevo');
                  resetSimulation();
                }}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  systemType === 'nuevo'
                    ? 'bg-green-500 text-black'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Sistema Nuevo
              </button>
            </div>

            <div className="ml-auto text-right">
              <div className="text-2xl font-bold text-slate-800">
                Día {currentDay}/30
              </div>
              <div className="text-sm text-slate-600">
                {((currentDay / 30) * 100).toFixed(0)}% completado
              </div>

              <div className="mt-2 text-xs text-slate-500">
                <div className="font-medium text-slate-700">Productos en producción hoy:</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {products.map(p => {
                    const evaluated = evaluatedProducts.includes(p.name);
                    const todaysProducts = getProductsForDay(currentDay);
                    const scheduledToday = todaysProducts.some(tp => tp.name === p.name);
                    
                    return (
                      <span
                        key={p.name}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          evaluated 
                            ? 'bg-green-100 text-green-800' 
                            : scheduledToday 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {p.name}
                        {evaluated ? ' ✓' : scheduledToday ? ' ⏳' : ''}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-1">
                  {evaluatedProducts.length > 0 ? (
                    <span className="text-green-600 font-medium text-sm">
                      {evaluatedProducts.length} producto{evaluatedProducts.length !== 1 ? 's' : ''} procesado{evaluatedProducts.length !== 1 ? 's' : ''} hoy
                    </span>
                  ) : currentDay > 0 ? (
                    <span className="text-slate-500 text-sm">Sin producción hoy</span>
                  ) : (
                    <span className="text-slate-400 text-sm">Esperando inicio...</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="w-full mt-4 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-black rounded-lg font-medium transition"
          >
            {showConfig ? 'Ocultar' : 'Mostrar'} Configuración de Productos
          </button>
        </div>

        {/* Panel de Configuración */}
        {showConfig && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Configuración de Productos
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left p-2">Producto</th>
                    <th className="text-left p-2">Frecuencia</th>
                    <th className="text-left p-2">Tiempo (s)</th>
                    <th className="text-left p-2">Temp. (°C)</th>
                    <th className="text-left p-2">Unidades/Batch</th>
                    <th className="text-left p-2">Lotes/Día</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="p-2 font-medium">{product.name}</td>
                      <td className="p-2 text-xs text-slate-600">
                        {product.frequency === 'variable' && '1-4x/semana'}
                        {product.frequency === 'weekly' && '3x/semana'}
                        {product.frequency === 'biweekly' && 'Cada 2 semanas'}
                        {product.frequency === 'monthly' && '1x/mes'}
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={product.time}
                          onChange={(e) => updateProduct(idx, 'time', e.target.value)}
                          className="w-20 px-2 py-1 border rounded"
                          disabled={isRunning}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={product.temp}
                          onChange={(e) => updateProduct(idx, 'temp', e.target.value)}
                          className="w-20 px-2 py-1 border rounded"
                          disabled={isRunning}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={product.units}
                          onChange={(e) => updateProduct(idx, 'units', e.target.value)}
                          className="w-24 px-2 py-1 border rounded"
                          disabled={isRunning}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={product.batchesPerDay}
                          onChange={(e) => updateProduct(idx, 'batchesPerDay', e.target.value)}
                          className="w-20 px-2 py-1 border rounded"
                          disabled={isRunning}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              * Los cambios se aplicarán al reiniciar la simulación
            </p>
          </div>
        )}

        {/* Estado Actual del Lote */}
        {currentBatch && currentDay < 30 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="text-blue-500" />
              Lote en Proceso - Día {currentDay}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-slate-600">Producto</div>
                <div className="text-lg font-bold text-blue-600">
                  {currentBatch.product}
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm text-slate-600">Temperatura</div>
                <div className={`text-lg font-bold ${
                  currentBatch.tempInRange ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentBatch.temperature.toFixed(1)}°C
                </div>
                <div className="text-xs text-slate-500">
                  Target: {currentBatch.targetTemp}°C
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-slate-600">Eficiencia</div>
                <div className="text-lg font-bold text-green-600">
                  {(currentBatch.efficiency * 100).toFixed(0)}%
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-slate-600">Tiempo</div>
                <div className="text-lg font-bold text-purple-600">
                  {currentBatch.time}s
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Métricas Totales */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-sm text-slate-600 mb-1">Aceite Usado</div>
            <div className="text-2xl font-bold text-blue-600">
              {totals.oilUsed.toFixed(1)} L
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-sm text-slate-600 mb-1">Aceite Perdido</div>
            <div className="text-2xl font-bold text-red-600">
              {totals.oilLost.toFixed(1)} L
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {((totals.oilLost / totals.oilUsed) * 100 || 0).toFixed(1)}%
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-sm text-slate-600 mb-1">Merma Producto</div>
            <div className="text-2xl font-bold text-orange-600">
              {totals.productLoss.toFixed(0)} unidades
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-sm text-slate-600 mb-1">Ingresos</div>
            <div className="text-2xl font-bold text-green-600">
              ${(totals.revenue / 1000000).toFixed(2)}M
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-sm text-slate-600 mb-1">Costos Pérdidas</div>
            <div className="text-2xl font-bold text-red-600">
              ${(totals.costs / 1000).toFixed(0)} m
            </div>
          </div>
        </div>

        {/* Gráficos y Análisis */}
        {currentDay === 30 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Análisis de Resultados - Simulación de 30 Días
              </h2>
              <div className="prose max-w-none text-slate-700 space-y-3">
                <p className="text-lg leading-relaxed">
                  <strong>Sistema simulado:</strong> {currentSystem.name}
                </p>
                <p className="leading-relaxed">
                  Durante el período de 30 días, el sistema procesó un total de{' '}
                  <strong className="text-blue-600">{totals.oilUsed.toFixed(1)} litros de aceite</strong>, 
                  de los cuales se perdieron{' '}
                  <strong className="text-red-600">{totals.oilLost.toFixed(1)} litros</strong>{' '}
                  ({((totals.oilLost / totals.oilUsed) * 100).toFixed(1)}% del total).
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-4 shadow">
                    <h3 className="font-semibold text-slate-800 mb-2">Control de Temperatura</h3>
                    <p className="text-sm">
                      {systemType === 'actual' 
                        ? 'El sistema actual presenta variaciones de ±15°C, lo que genera cocción irregular y mayor degradación del aceite.'
                        : 'El sistema Western Kitchen mantiene una variación de solo ±2°C, garantizando cocción uniforme y menor estrés térmico del aceite.'
                      }
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow">
                    <h3 className="font-semibold text-slate-800 mb-2">Pérdidas de Aceite</h3>
                    <p className="text-sm">
                      {systemType === 'actual'
                        ? 'Sin sistema de filtrado, el aceite se contamina rápidamente con residuos, obligando a reemplazarlo con mayor frecuencia (30% de pérdida).'
                        : 'El filtrado automático elimina partículas continuamente, extendiendo la vida útil del aceite y reduciendo las pérdidas al 15%.'
                      }
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow">
                    <h3 className="font-semibold text-slate-800 mb-2">Merma de Producto</h3>
                    <p className="text-sm">
                      Las mermas alcanzaron {totals.productLoss.toFixed(0)} unidades. {systemType === 'actual'
                        ? 'La variabilidad térmica causa sobrecocción y reventones, especialmente en empanaditas de queso.'
                        : 'El control preciso reduce la sobrecocción y mantiene la integridad estructural de los productos.'
                      }
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow">
                    <h3 className="font-semibold text-slate-800 mb-2">Impacto Económico</h3>
                    <p className="text-sm">
                      Las pérdidas totales ascendieron a <strong>${totals.costs.toLocaleString()} CLP</strong>. 
                      {systemType === 'nuevo' && ' Esto representa un ahorro significativo mensual vs el sistema actual.'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-100 border-l-4 border-blue-500 rounded">
                  <p className="font-semibold text-blue-900">
                    Conclusión: {systemType === 'actual' 
                      ? 'El sistema actual presenta ineficiencias significativas que impactan en costos operativos y calidad del producto.'
                      : 'El sistema Western Kitchen 40L reduce las pérdidas considerablemente, mejora la calidad del producto y ofrece un retorno de inversión atractivo.'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">
                Evolución de Costos por Pérdidas (30 Días)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={productionData.map((d, i) => ({
                  day: d.day,
                  costoDiario: d.costs / 1000,
                  costoAcumulado: productionData.slice(0, i + 1).reduce((sum, item) => sum + item.costs, 0) / 1000
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="day" 
                    label={{ value: 'Día de Operación', position: 'insideBottom', offset: -5 }}
                    stroke="#64748b"
                  />
                  <YAxis 
                    label={{ value: 'Costo (Miles CLP)', angle: -90, position: 'insideLeft' }}
                    stroke="#64748b"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}
                    formatter={(value) => `${value.toFixed(2)}K`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="costoDiario" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Costo Diario" 
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="costoAcumulado" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    name="Costo Acumulado" 
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-orange-50 rounded p-3">
                  <div className="text-sm text-slate-600">Costo Promedio Diario</div>
                  <div className="text-2xl font-bold text-orange-600">
                    ${(totals.costs / 30 / 1000).toFixed(2)}K CLP
                  </div>
                </div>
                <div className="bg-red-50 rounded p-3">
                  <div className="text-sm text-slate-600">Costo Total del Mes</div>
                  <div className="text-2xl font-bold text-red-600">
                    ${(totals.costs / 1000).toFixed(2)}K CLP
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparación de Sistemas */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Comparación de Sistemas (Proyección Mensual)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparisonData.map((item, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4">
                <div className="text-sm font-medium text-slate-600 mb-2">
                  {item.metric}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Actual:</span>
                    <span className="text-lg font-bold text-orange-600">
                      {item.actual.toLocaleString()} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Nuevo:</span>
                    <span className="text-lg font-bold text-green-600">
                      {item.nuevo.toLocaleString()} {item.unit}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-center gap-1">
                    <TrendingDown className="text-green-500" size={16} />
                    <span className="text-sm font-medium text-green-600">
                      {(((item.actual - item.nuevo) / item.actual) * 100).toFixed(0)}% reducción
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Análisis Económico */}
        {currentDay === 30 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-lg p-6 border-2 border-green-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              Análisis Económico - Mes Completo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-sm text-slate-600 mb-2">Pérdidas Totales ({systemType === 'actual' ? 'Actual' : 'Nuevo'})</div>
                <div className="text-3xl font-bold text-red-600">
                  ${totals.costs.toLocaleString()} CLP
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-sm text-slate-600 mb-2">Ahorro Proyectado</div>
                <div className="text-3xl font-bold text-green-600">
                  ${(1127231 - totals.costs).toLocaleString()} CLP
                </div>
                <div className="text-xs text-slate-500 mt-1">vs sistema actual</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-sm text-slate-600 mb-2">ROI Mensual</div>
                <div className="text-3xl font-bold text-blue-600">
                  {((563615 / 2500000) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">Payback: 4.4 meses</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FryerSimulation;