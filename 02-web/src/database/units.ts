export const UNITS_DB: Record<string, { label: string; units: { display: string; ratio: number }[] }> = {
  "length": {
    "label": "長度 (Length)",
    "units": [
      {
        "display": "m",
        "ratio": 1
      },
      {
        "display": "cm",
        "ratio": 0.01
      },
      {
        "display": "mm",
        "ratio": 0.001
      },
      {
        "display": "um",
        "ratio": 0.000001
      },
      {
        "display": "nm",
        "ratio": 1e-9
      },
      {
        "display": "km",
        "ratio": 1000
      },
      {
        "display": "in",
        "ratio": 0.0254
      },
      {
        "display": "ft",
        "ratio": 0.3048
      },
      {
        "display": "yd",
        "ratio": 0.9144
      },
      {
        "display": "mi",
        "ratio": 1609.344
      },
      {
        "display": "nmi",
        "ratio": 1853.184
      },
      {
        "display": "Å",
        "ratio": 1e-10
      },
      {
        "display": "fm",
        "ratio": 1e-15
      }
    ]
  },
  "mass": {
    "label": "質量 (Mass)",
    "units": [
      {
        "display": "kg",
        "ratio": 1
      },
      {
        "display": "g",
        "ratio": 0.001
      },
      {
        "display": "mg",
        "ratio": 0.000001
      },
      {
        "display": "lb",
        "ratio": 0.453592
      },
      {
        "display": "slug",
        "ratio": 14.5939
      },
      {
        "display": "u",
        "ratio": 1.660539e-27
      },
      {
        "display": "eV/c^2",
        "ratio": 1.782662e-36
      },
      {
        "display": "MeV/c^2",
        "ratio": 1.782662e-30
      }
    ]
  },
  "time": {
    "label": "時間 (Time)",
    "units": [
      {
        "display": "s",
        "ratio": 1
      },
      {
        "display": "ms",
        "ratio": 0.001
      },
      {
        "display": "us",
        "ratio": 0.000001
      },
      {
        "display": "ns",
        "ratio": 1e-9
      },
      {
        "display": "min",
        "ratio": 60
      },
      {
        "display": "hr",
        "ratio": 3600
      }
    ]
  },
  "voltage": {
    "label": "電壓 / 電動勢 (Voltage / EMF)",
    "units": [
      {
        "display": "V",
        "ratio": 1
      },
      {
        "display": "mV",
        "ratio": 0.001
      },
      {
        "display": "uV",
        "ratio": 0.000001
      },
      {
        "display": "kV",
        "ratio": 1000
      },
      {
        "display": "MV",
        "ratio": 1000000
      }
    ]
  },
  "current": {
    "label": "電流 (Current)",
    "units": [
      {
        "display": "A",
        "ratio": 1
      },
      {
        "display": "mA",
        "ratio": 0.001
      },
      {
        "display": "uA",
        "ratio": 0.000001
      },
      {
        "display": "nA",
        "ratio": 1e-9
      }
    ]
  },
  "resistance": {
    "label": "電阻",
    "units": [
      {
        "display": "Ω",
        "ratio": 1
      },
      {
        "display": "mΩ",
        "ratio": 0.001
      },
      {
        "display": "kΩ",
        "ratio": 1000
      },
      {
        "display": "MΩ",
        "ratio": 1000000
      },
      {
        "display": "GΩ",
        "ratio": 1000000000
      }
    ]
  },
  "capacitance": {
    "label": "電容 (Capacitance)",
    "units": [
      {
        "display": "F",
        "ratio": 1
      },
      {
        "display": "mF",
        "ratio": 0.001
      },
      {
        "display": "uF",
        "ratio": 0.000001
      },
      {
        "display": "nF",
        "ratio": 1e-9
      },
      {
        "display": "pF",
        "ratio": 1e-12
      }
    ]
  },
  "inductance": {
    "label": "電感 (Inductance)",
    "units": [
      {
        "display": "H",
        "ratio": 1
      },
      {
        "display": "mH",
        "ratio": 0.001
      },
      {
        "display": "uH",
        "ratio": 0.000001
      },
      {
        "display": "nH",
        "ratio": 1e-9
      }
    ]
  },
  "force": {
    "label": "力 (Force)",
    "units": [
      {
        "display": "N",
        "ratio": 1
      },
      {
        "display": "kN",
        "ratio": 1000
      },
      {
        "display": "mN",
        "ratio": 0.001
      },
      {
        "display": "kgf",
        "ratio": 9.80665
      },
      {
        "display": "dyne",
        "ratio": 0.00001
      },
      {
        "display": "lb",
        "ratio": 4.448444
      }
    ]
  },
  "pressure": {
    "label": "壓力 (Pressure)",
    "units": [
      {
        "display": "Pa",
        "ratio": 1
      },
      {
        "display": "kPa",
        "ratio": 1000
      },
      {
        "display": "MPa",
        "ratio": 1000000
      },
      {
        "display": "bar",
        "ratio": 100000
      },
      {
        "display": "atm",
        "ratio": 101325
      },
      {
        "display": "psi",
        "ratio": 6894.76
      },
      {
        "display": "N/m^2",
        "ratio": 1
      }
    ]
  },
  "energy": {
    "label": "能量 / 作功 (Energy / Work)",
    "units": [
      {
        "display": "J",
        "ratio": 1
      },
      {
        "display": "kJ",
        "ratio": 1000
      },
      {
        "display": "cal",
        "ratio": 4.184
      },
      {
        "display": "kcal",
        "ratio": 4184
      },
      {
        "display": "eV",
        "ratio": 1.60218e-19
      },
      {
        "display": "kWh",
        "ratio": 3600000
      },
      {
        "display": "mJ",
        "ratio": 0.001
      },
      {
        "display": "erg",
        "ratio": 1e-7
      },
      {
        "display": "Btu",
        "ratio": 1054.35
      },
      {
        "display": "keV",
        "ratio": 1.6021766e-16
      },
      {
        "display": "MeV",
        "ratio": 1.6021766e-13
      },
      {
        "display": "GeV",
        "ratio": 1.6021766e-10
      }
    ]
  },
  "power": {
    "label": "功率 (Power)",
    "units": [
      {
        "display": "W",
        "ratio": 1
      },
      {
        "display": "mW",
        "ratio": 0.001
      },
      {
        "display": "kW",
        "ratio": 1000
      },
      {
        "display": "MW",
        "ratio": 1000000
      },
      {
        "display": "hp",
        "ratio": 745.7
      },
      {
        "display": "Btu/h",
        "ratio": 0.292875
      },
      {
        "display": "cal/s",
        "ratio": 4.184
      }
    ]
  },
  "frequency": {
    "label": "頻率 (Frequency)",
    "units": [
      {
        "display": "Hz",
        "ratio": 1
      },
      {
        "display": "kHz",
        "ratio": 1000
      },
      {
        "display": "MHz",
        "ratio": 1000000
      },
      {
        "display": "GHz",
        "ratio": 1000000000
      },
      {
        "display": "THz",
        "ratio": 1000000000000
      }
    ]
  },
  "temperature_delta": {
    "label": "溫差 (Delta T)",
    "units": [
      {
        "display": "K",
        "ratio": 1
      },
      {
        "display": "degC",
        "ratio": 1
      },
      {
        "display": "degF",
        "ratio": 0.555556
      }
    ]
  },
  "dimensionless": {
    "label": "無因次 / 純量 (Dimensionless)",
    "units": [
      {
        "display": "無",
        "ratio": 1
      },
      {
        "display": "%",
        "ratio": 0.01
      },
      {
        "display": "ppm",
        "ratio": 0.000001
      }
    ]
  },
  "electric_charge": {
    "label": "電荷 (Electric Charge)",
    "units": [
      {
        "display": "C",
        "ratio": 1
      },
      {
        "display": "mC",
        "ratio": 0.001
      },
      {
        "display": "uC",
        "ratio": 0.000001
      },
      {
        "display": "nC",
        "ratio": 1e-9
      },
      {
        "display": "pC",
        "ratio": 1e-12
      }
    ]
  },
  "temperature": {
    "label": "溫度 (Temperature)",
    "units": [
      {
        "display": "K",
        "ratio": 1
      }
    ]
  },
  "resistance_impedance": {
    "label": "電阻 / 阻抗 / 電抗 (Resistance / Impedance / Reactance)",
    "units": [
      {
        "display": "Ω",
        "ratio": 1
      },
      {
        "display": "kΩ",
        "ratio": 1000
      },
      {
        "display": "MΩ",
        "ratio": 1000000
      }
    ]
  },
  "conductance_admittance": {
    "label": "電導 / 導納 / 電納 (Conductance / Admittance / Susceptance)",
    "units": [
      {
        "display": "S",
        "ratio": 1
      },
      {
        "display": "mS",
        "ratio": 0.001
      },
      {
        "display": "uS",
        "ratio": 0.000001
      }
    ]
  },
  "electric_field": {
    "label": "電場強度 (Electric Field Intensity)",
    "units": [
      {
        "display": "V/m",
        "ratio": 1
      },
      {
        "display": "kV/m",
        "ratio": 1000
      },
      {
        "display": "MV/m",
        "ratio": 1000000
      }
    ]
  },
  "electric_flux_density": {
    "label": "電通量密度 / 電極化向量 (Electric Flux Density / Polarization)",
    "units": [
      {
        "display": "C/m^2",
        "ratio": 1
      },
      {
        "display": "uC/m^2",
        "ratio": 0.000001
      },
      {
        "display": "nC/m^2",
        "ratio": 1e-9
      }
    ]
  },
  "magnetic_field": {
    "label": "磁場強度 (Magnetic Field Intensity)",
    "units": [
      {
        "display": "A/m",
        "ratio": 1
      },
      {
        "display": "mA/m",
        "ratio": 0.001
      }
    ]
  },
  "magnetic_flux_density": {
    "label": "磁通量密度 (Magnetic Flux Density)",
    "units": [
      {
        "display": "T",
        "ratio": 1
      },
      {
        "display": "mT",
        "ratio": 0.001
      },
      {
        "display": "uT",
        "ratio": 0.000001
      },
      {
        "display": "Wb/m^2",
        "ratio": 1
      }
    ]
  },
  "magnetic_flux": {
    "label": "磁通量 (Magnetic Flux)",
    "units": [
      {
        "display": "Wb",
        "ratio": 1
      },
      {
        "display": "mWb",
        "ratio": 0.001
      },
      {
        "display": "uWb",
        "ratio": 0.000001
      }
    ]
  },
  "magnetic_potential_vector": {
    "label": "磁向量位 (Magnetic Vector Potential)",
    "units": [
      {
        "display": "Wb/m",
        "ratio": 1
      }
    ]
  },
  "magnetic_dipole_moment": {
    "label": "磁偶極矩 (Magnetic Dipole Moment)",
    "units": [
      {
        "display": "A·m^2",
        "ratio": 1
      }
    ]
  },
  "electric_dipole_moment": {
    "label": "電偶極矩 (Electric Dipole Moment)",
    "units": [
      {
        "display": "C·m",
        "ratio": 1
      }
    ]
  },
  "permittivity": {
    "label": "電容率 / 介電常數 (Permittivity)",
    "units": [
      {
        "display": "F/m",
        "ratio": 1
      }
    ]
  },
  "permeability": {
    "label": "導磁率 (Permeability)",
    "units": [
      {
        "display": "H/m",
        "ratio": 1
      }
    ]
  },
  "conductivity": {
    "label": "電導率 (Conductivity)",
    "units": [
      {
        "display": "S/m",
        "ratio": 1
      },
      {
        "display": "MS/m",
        "ratio": 1000000
      }
    ]
  },
  "charge_density_volume": {
    "label": "體電荷密度 (Volume Charge Density)",
    "units": [
      {
        "display": "C/m^3",
        "ratio": 1
      },
      {
        "display": "mC/m^3",
        "ratio": 0.001
      },
      {
        "display": "uC/m^3",
        "ratio": 0.000001
      }
    ]
  },
  "charge_density_surface": {
    "label": "面電荷密度 (Surface Charge Density)",
    "units": [
      {
        "display": "C/m^2",
        "ratio": 1
      },
      {
        "display": "mC/m^2",
        "ratio": 0.001
      },
      {
        "display": "uC/m^2",
        "ratio": 0.000001
      }
    ]
  },
  "charge_density_linear": {
    "label": "線電荷密度 (Linear Charge Density)",
    "units": [
      {
        "display": "C/m",
        "ratio": 1
      },
      {
        "display": "mC/m",
        "ratio": 0.001
      },
      {
        "display": "uC/m",
        "ratio": 0.000001
      }
    ]
  },
  "current_density_volume": {
    "label": "體電流密度 (Volume Current Density)",
    "units": [
      {
        "display": "A/m^2",
        "ratio": 1
      },
      {
        "display": "mA/m^2",
        "ratio": 0.001
      }
    ]
  },
  "current_density_surface": {
    "label": "面電流密度 (Surface Current Density)",
    "units": [
      {
        "display": "A/m",
        "ratio": 1
      },
      {
        "display": "mA/m",
        "ratio": 0.001
      }
    ]
  },
  "mobility": {
    "label": "載子遷移率 (Electron / Hole Mobility)",
    "units": [
      {
        "display": "m^2/V·s",
        "ratio": 1
      }
    ]
  },
  "angular_frequency": {
    "label": "角頻率 / 角速度 (Angular Frequency / Velocity)",
    "units": [
      {
        "display": "rad/s",
        "ratio": 1
      }
    ]
  },
  "wavenumber": {
    "label": "波數 / 相位常數 (Wavenumber / Phase Constant)",
    "units": [
      {
        "display": "rad/m",
        "ratio": 1
      }
    ]
  },
  "attenuation_constant": {
    "label": "衰減常數 (Attenuation Constant)",
    "units": [
      {
        "display": "Np/m",
        "ratio": 1
      }
    ]
  },
  "velocity": {
    "label": "速度 (Velocity)",
    "units": [
      {
        "display": "m/s",
        "ratio": 1
      },
      {
        "display": "km/s",
        "ratio": 1000
      },
      {
        "display": "km/hr",
        "ratio": 0.277778
      }
    ]
  },
  "torque": {
    "label": "力矩 (Torque)",
    "units": [
      {
        "display": "N·m",
        "ratio": 1
      }
    ]
  },
  "energy_density": {
    "label": "能量密度 (Energy Density)",
    "units": [
      {
        "display": "J/m^3",
        "ratio": 1
      }
    ]
  },
  "power_density": {
    "label": "功率密度 / 坡印廷向量 (Power Density / Poynting Vector)",
    "units": [
      {
        "display": "W/m^2",
        "ratio": 1
      },
      {
        "display": "mW/m^2",
        "ratio": 0.001
      }
    ]
  },
  "area": {
    "label": "面積 / 雷達截面積 (Area / Radar Cross Section)",
    "units": [
      {
        "display": "m^2",
        "ratio": 1
      },
      {
        "display": "cm^2",
        "ratio": 0.0001
      },
      {
        "display": "mm^2",
        "ratio": 0.000001
      },
      {
        "display": "acre",
        "ratio": 4046.8564
      },
      {
        "display": "mi^2",
        "ratio": 2589988.1
      }
    ]
  },
  "angle": {
    "label": "角度 (Angle)",
    "units": [
      {
        "display": "deg",
        "ratio": 1
      },
      {
        "display": "rad",
        "ratio": 57.2957795
      },
      {
        "display": "'",
        "ratio": 0.000290888
      },
      {
        "display": "''",
        "ratio": 0.000004848
      }
    ]
  },
  "solid_angle": {
    "label": "立體角 (Solid Angle)",
    "units": [
      {
        "display": "sr",
        "ratio": 1
      }
    ]
  },
  "gravitational_field": {
    "label": "重力場 (Gravitational Field)",
    "units": [
      {
        "display": "N/kg",
        "ratio": 1
      }
    ]
  },
  "volume": {
    "label": "體積 (Volume)",
    "units": [
      {
        "display": "m^3",
        "ratio": 1
      },
      {
        "display": "cm^3",
        "ratio": 0.000001
      },
      {
        "display": "fl oz",
        "ratio": 0.00002957373
      },
      {
        "display": "U.S. gal",
        "ratio": 0.0037854118
      },
      {
        "display": "Imp. gal",
        "ratio": 0.004546087
      }
    ]
  },
  "momentum": {
    "label": "動量 (Momentum)",
    "units": [
      {
        "display": "kg·m/s",
        "ratio": 1
      },
      {
        "display": "eV/c",
        "ratio": 5.344286e-28
      },
      {
        "display": "MeV/c",
        "ratio": 5.344286e-22
      }
    ]
  },
  "cross_section": {
    "label": "截面積 (Cross Section)",
    "units": [
      {
        "display": "m^2",
        "ratio": 1
      },
      {
        "display": "b",
        "ratio": 1e-28
      }
    ]
  },
  "radioactivity": {
    "label": "放射性活度 (Radioactivity)",
    "units": [
      {
        "display": "Bq",
        "ratio": 1
      },
      {
        "display": "Ci",
        "ratio": 37000000000
      }
    ]
  },
  "absorbed_dose": {
    "label": "吸收劑量 (Absorbed Dose)",
    "units": [
      {
        "display": "Gy",
        "ratio": 1
      },
      {
        "display": "rad",
        "ratio": 0.01
      }
    ]
  },
  "dose_equivalent": {
    "label": "等效劑量 (Dose Equivalent)",
    "units": [
      {
        "display": "Sv",
        "ratio": 1
      },
      {
        "display": "rem",
        "ratio": 0.01
      }
    ]
  }
};
