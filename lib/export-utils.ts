"use client"

// Export utilities for Wattle PDF and CSV generation

export interface ExportData {
  headers: string[]
  rows: (string | number)[][]
  title: string
  subtitle?: string
  generatedAt?: Date
}

const GRIDALERT_PRIMARY = "#F2B300"
const GRIDALERT_TEXT = "#24211C"

// The Wattle mark (small, P1) for the report header
const gridAlertLogoSvg = `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><title>Wattle</title><rect width="256" height="256" fill="#F7F3EA"/><circle cx="126.11" cy="116.40" r="6.87" fill="#F2B300"/><circle cx="140.77" cy="121.88" r="6.81" fill="#F2B300"/><circle cx="113.53" cy="125.73" r="6.80" fill="#F2B300"/><circle cx="142.94" cy="137.50" r="6.70" fill="#F2B300"/><circle cx="112.23" cy="140.92" r="6.62" fill="#F2B300"/><circle cx="112.25" cy="110.17" r="6.50" fill="#F2B300"/><circle cx="138.71" cy="106.50" r="6.49" fill="#F2B300"/><circle cx="124.25" cy="101.46" r="6.38" fill="#F2B300"/><circle cx="155.21" cy="126.73" r="6.36" fill="#F2B300"/><circle cx="142.99" cy="152.41" r="6.30" fill="#F2B300"/><circle cx="99.51" cy="132.07" r="6.30" fill="#F2B300"/><circle cx="152.52" cy="112.43" r="6.28" fill="#F2B300"/><circle cx="98.76" cy="116.94" r="6.19" fill="#F2B300"/><circle cx="111.07" cy="155.71" r="6.13" fill="#F2B300"/><circle cx="156.43" cy="143.87" r="6.13" fill="#F2B300"/><circle cx="98.47" cy="146.76" r="6.02" fill="#F2B300"/><circle cx="111.36" cy="95.67" r="5.95" fill="#F2B300"/><circle cx="136.60" cy="92.22" r="5.93" fill="#F2B300"/><circle cx="149.77" cy="97.55" r="5.90" fill="#F2B300"/><circle cx="99.22" cy="102.57" r="5.82" fill="#F2B300"/><circle cx="166.36" cy="118.08" r="5.79" fill="#F2B300"/><circle cx="167.25" cy="135.09" r="5.77" fill="#F2B300"/><circle cx="122.72" cy="87.43" r="5.73" fill="#F2B300"/><circle cx="142.56" cy="166.25" r="5.72" fill="#F2B300"/><circle cx="156.38" cy="157.69" r="5.71" fill="#F2B300"/><circle cx="86.56" cy="125.14" r="5.69" fill="#F2B300"/><circle cx="86.62" cy="139.03" r="5.62" fill="#F2B300"/><circle cx="113.27" cy="169.19" r="5.57" fill="#F2B300"/><circle cx="98.17" cy="160.52" r="5.55" fill="#F2B300"/><circle cx="168.99" cy="148.88" r="5.45" fill="#F2B300"/><circle cx="86.67" cy="152.71" r="5.33" fill="#F2B300"/><circle cx="145.83" cy="82.82" r="5.30" fill="#F2B300"/><circle cx="132.96" cy="78.96" r="5.26" fill="#F2B300"/><circle cx="111.28" cy="81.73" r="5.26" fill="#F2B300"/><circle cx="177.26" cy="125.30" r="5.26" fill="#F2B300"/><circle cx="155.32" cy="170.56" r="5.18" fill="#F2B300"/><circle cx="75.81" cy="132.66" r="5.08" fill="#F2B300"/><circle cx="179.05" cy="139.90" r="5.07" fill="#F2B300"/><circle cx="138.54" cy="179.39" r="5.07" fill="#F2B300"/><circle cx="100.38" cy="172.97" r="5.05" fill="#F2B300"/><circle cx="168.56" cy="162.22" r="5.03" fill="#F2B300"/><circle cx="74.95" cy="120.41" r="5.01" fill="#F2B300"/><circle cx="119.25" cy="181.05" r="4.99" fill="#F2B300"/><circle cx="121.96" cy="74.00" r="4.96" fill="#F2B300"/><circle cx="75.86" cy="145.50" r="4.92" fill="#F2B300"/><circle cx="86.46" cy="165.31" r="4.87" fill="#F2B300"/><circle cx="179.23" cy="155.24" r="4.72" fill="#F2B300"/><circle cx="185.26" cy="116.22" r="4.70" fill="#F2B300"/><circle cx="142.66" cy="71.16" r="4.69" fill="#F2B300"/><circle cx="150.47" cy="182.27" r="4.68" fill="#F2B300"/><circle cx="107.98" cy="183.36" r="4.67" fill="#F2B300"/><circle cx="187.32" cy="131.60" r="4.63" fill="#F2B300"/><circle cx="76.60" cy="158.76" r="4.61" fill="#F2B300"/><circle cx="166.44" cy="173.92" r="4.60" fill="#F2B300"/><circle cx="129.98" cy="187.90" r="4.60" fill="#F2B300"/><circle cx="111.35" cy="69.98" r="4.58" fill="#F2B300"/><circle cx="132.15" cy="67.27" r="4.54" fill="#F2B300"/><circle cx="89.32" cy="176.16" r="4.48" fill="#F2B300"/><circle cx="67.97" cy="111.52" r="4.45" fill="#F2B300"/><circle cx="65.83" cy="126.97" r="4.42" fill="#F2B300"/><circle cx="66.07" cy="139.09" r="4.41" fill="#F2B300"/><circle cx="188.10" cy="146.96" r="4.40" fill="#F2B300"/><circle cx="141.87" cy="190.21" r="4.35" fill="#F2B300"/><circle cx="179.31" cy="166.42" r="4.32" fill="#F2B300"/><circle cx="97.16" cy="184.25" r="4.32" fill="#F2B300"/><circle cx="183.10" cy="94.70" r="4.31" fill="#F2B300"/><circle cx="72.65" cy="94.46" r="4.29" fill="#F2B300"/><circle cx="188.74" cy="105.26" r="4.27" fill="#F2B300"/><circle cx="116.46" cy="192.03" r="4.26" fill="#F2B300"/><circle cx="120.26" cy="63.08" r="4.24" fill="#F2B300"/><circle cx="161.37" cy="184.30" r="4.23" fill="#F2B300"/><circle cx="66.93" cy="152.31" r="4.22" fill="#F2B300"/><circle cx="77.88" cy="85.40" r="4.21" fill="#F2B300"/><circle cx="178.45" cy="85.41" r="4.19" fill="#F2B300"/><circle cx="193.80" cy="122.74" r="4.19" fill="#F2B300"/><circle cx="76.90" cy="170.40" r="4.17" fill="#F2B300"/><circle cx="152.88" cy="65.87" r="4.13" fill="#F2B300"/><circle cx="101.53" cy="65.16" r="4.05" fill="#F2B300"/><circle cx="82.88" cy="76.65" r="4.03" fill="#F2B300"/><circle cx="64.71" cy="101.48" r="4.02" fill="#F2B300"/><circle cx="189.98" cy="157.24" r="4.01" fill="#F2B300"/><circle cx="195.76" cy="138.76" r="4.01" fill="#F2B300"/><circle cx="173.11" cy="76.12" r="4.00" fill="#F2B300"/><circle cx="60.25" cy="118.27" r="4.00" fill="#F2B300"/><circle cx="143.97" cy="60.74" r="3.98" fill="#F2B300"/><circle cx="176.27" cy="177.26" r="3.97" fill="#F2B300"/><circle cx="105.57" cy="193.70" r="3.95" fill="#F2B300"/><circle cx="153.27" cy="192.73" r="3.95" fill="#F2B300"/><circle cx="125.73" cy="197.62" r="3.94" fill="#F2B300"/><circle cx="195.88" cy="112.24" r="3.91" fill="#F2B300"/><circle cx="67.87" cy="165.29" r="3.86" fill="#F2B300"/><circle cx="57.34" cy="133.88" r="3.85" fill="#F2B300"/><circle cx="130.89" cy="56.99" r="3.84" fill="#F2B300"/><circle cx="110.51" cy="59.02" r="3.83" fill="#F2B300"/><circle cx="79.68" cy="180.35" r="3.82" fill="#F2B300"/><circle cx="136.03" cy="198.96" r="3.81" fill="#F2B300"/><circle cx="58.84" cy="146.57" r="3.80" fill="#F2B300"/><circle cx="87.62" cy="186.97" r="3.80" fill="#F2B300"/><circle cx="166.02" cy="67.10" r="3.78" fill="#F2B300"/><circle cx="91.51" cy="65.98" r="3.78" fill="#F2B300"/><circle cx="170.98" cy="186.11" r="3.74" fill="#F2B300"/><circle cx="57.95" cy="108.94" r="3.73" fill="#F2B300"/><circle cx="200.48" cy="130.16" r="3.73" fill="#F2B300"/><circle cx="189.20" cy="167.00" r="3.72" fill="#F2B300"/><circle cx="193.81" cy="96.52" r="3.70" fill="#F2B300"/><circle cx="197.67" cy="149.78" r="3.69" fill="#F2B300"/><circle cx="188.80" cy="86.33" r="3.64" fill="#F2B300"/><circle cx="94.59" cy="193.70" r="3.64" fill="#F2B300"/><circle cx="66.89" cy="86.58" r="3.64" fill="#F2B300"/><circle cx="146.62" cy="199.52" r="3.63" fill="#F2B300"/><circle cx="53.36" cy="125.18" r="3.57" fill="#F2B300"/><circle cx="112.15" cy="200.97" r="3.57" fill="#F2B300"/><circle cx="163.31" cy="193.82" r="3.57" fill="#F2B300"/><circle cx="121.28" cy="53.50" r="3.57" fill="#F2B300"/><circle cx="58.84" cy="157.43" r="3.54" fill="#F2B300"/><circle cx="182.88" cy="76.63" r="3.53" fill="#F2B300"/><circle cx="72.09" cy="77.54" r="3.53" fill="#F2B300"/><circle cx="202.72" cy="119.25" r="3.53" fill="#F2B300"/><circle cx="185.77" cy="176.31" r="3.52" fill="#F2B300"/><circle cx="159.51" cy="103.12" r="3.51" fill="#F2B300"/><circle cx="152.44" cy="56.35" r="3.50" fill="#F2B300"/><circle cx="160.58" cy="59.83" r="3.48" fill="#F2B300"/><circle cx="69.23" cy="175.98" r="3.48" fill="#F2B300"/><circle cx="199.99" cy="103.34" r="3.46" fill="#F2B300"/><circle cx="59.76" cy="93.56" r="3.44" fill="#F2B300"/><circle cx="81.55" cy="67.22" r="3.44" fill="#F2B300"/><circle cx="138.51" cy="51.94" r="3.42" fill="#F2B300"/><circle cx="101.52" cy="55.82" r="3.41" fill="#F2B300"/><circle cx="175.06" cy="66.66" r="3.37" fill="#F2B300"/><circle cx="119.98" cy="204.87" r="3.37" fill="#F2B300"/><circle cx="199.13" cy="158.66" r="3.36" fill="#F2B300"/><circle cx="51.48" cy="115.03" r="3.35" fill="#F2B300"/><circle cx="204.46" cy="142.01" r="3.34" fill="#F2B300"/><circle cx="51.23" cy="140.47" r="3.33" fill="#F2B300"/><circle cx="130.21" cy="205.83" r="3.33" fill="#F2B300"/><circle cx="180.99" cy="185.09" r="3.32" fill="#F2B300"/><circle cx="101.48" cy="201.90" r="3.28" fill="#F2B300"/><circle cx="54.39" cy="100.47" r="3.28" fill="#F2B300"/><circle cx="155.79" cy="201.57" r="3.27" fill="#F2B300"/><circle cx="58.95" cy="166.45" r="3.24" fill="#F2B300"/><circle cx="113.18" cy="50.27" r="3.24" fill="#F2B300"/><circle cx="78.58" cy="189.84" r="3.23" fill="#F2B300"/><circle cx="205.46" cy="111.04" r="3.22" fill="#F2B300"/><circle cx="128.75" cy="48.40" r="3.20" fill="#F2B300"/><circle cx="92.75" cy="57.29" r="3.20" fill="#F2B300"/><circle cx="140.79" cy="206.68" r="3.18" fill="#F2B300"/><circle cx="51.47" cy="151.57" r="3.16" fill="#F2B300"/><circle cx="71.61" cy="185.07" r="3.15" fill="#F2B300"/><circle cx="85.67" cy="196.18" r="3.15" fill="#F2B300"/><circle cx="47.53" cy="133.08" r="3.12" fill="#F2B300"/><circle cx="170.26" cy="59.29" r="3.12" fill="#F2B300"/><circle cx="72.99" cy="68.87" r="3.11" fill="#F2B300"/><circle cx="146.49" cy="49.35" r="3.11" fill="#F2B300"/><circle cx="199.04" cy="89.43" r="3.10" fill="#F2B300"/><circle cx="172.91" cy="195.18" r="3.10" fill="#F2B300"/><circle cx="208.85" cy="126.00" r="3.09" fill="#F2B300"/><circle cx="198.04" cy="168.57" r="3.09" fill="#F2B300"/><circle cx="208.73" cy="134.90" r="3.08" fill="#F2B300"/><circle cx="84.87" cy="59.28" r="3.08" fill="#F2B300"/><circle cx="192.16" cy="77.91" r="3.06" fill="#F2B300"/><circle cx="62.95" cy="78.71" r="3.04" fill="#F2B300"/><circle cx="206.39" cy="150.49" r="3.04" fill="#F2B300"/><circle cx="183.17" cy="67.93" r="3.04" fill="#F2B300"/><circle cx="48.34" cy="107.20" r="2.99" fill="#F2B300"/><circle cx="60.25" cy="174.37" r="2.99" fill="#F2B300"/><circle cx="91.42" cy="201.82" r="2.98" fill="#F2B300"/><circle cx="195.01" cy="176.06" r="2.97" fill="#F2B300"/><circle cx="105.33" cy="48.51" r="2.96" fill="#F2B300"/><circle cx="149.77" cy="207.66" r="2.96" fill="#F2B300"/><circle cx="45.55" cy="121.23" r="2.96" fill="#F2B300"/><circle cx="56.90" cy="85.59" r="2.95" fill="#F2B300"/><circle cx="203.84" cy="95.65" r="2.95" fill="#F2B300"/><circle cx="159.76" cy="51.52" r="2.95" fill="#F2B300"/><circle cx="108.46" cy="208.42" r="2.94" fill="#F2B300"/><circle cx="189.20" cy="183.97" r="2.93" fill="#F2B300"/><circle cx="166.05" cy="201.75" r="2.93" fill="#F2B300"/><circle cx="120.38" cy="45.01" r="2.91" fill="#F2B300"/><circle cx="51.10" cy="160.48" r="2.89" fill="#F2B300"/><circle cx="210.81" cy="117.02" r="2.88" fill="#F2B300"/><circle cx="180.83" cy="193.10" r="2.86" fill="#F2B300"/><circle cx="64.07" cy="182.37" r="2.86" fill="#F2B300"/><circle cx="136.02" cy="44.03" r="2.82" fill="#F2B300"/><circle cx="208.56" cy="103.15" r="2.82" fill="#F2B300"/><circle cx="51.42" cy="92.53" r="2.82" fill="#F2B300"/><circle cx="125.03" cy="212.39" r="2.81" fill="#F2B300"/><circle cx="45.30" cy="145.89" r="2.80" fill="#F2B300"/><circle cx="103.68" cy="88.43" r="2.80" fill="#F2B300"/><circle cx="75.72" cy="61.18" r="2.79" fill="#F2B300"/><circle cx="96.67" cy="49.04" r="2.78" fill="#F2B300"/><circle cx="198.85" cy="81.76" r="2.77" fill="#F2B300"/><circle cx="178.05" cy="59.26" r="2.77" fill="#F2B300"/><circle cx="64.69" cy="70.90" r="2.75" fill="#F2B300"/><circle cx="135.96" cy="212.80" r="2.75" fill="#F2B300"/><circle cx="207.63" cy="158.48" r="2.74" fill="#F2B300"/><circle cx="117.07" cy="212.63" r="2.74" fill="#F2B300"/><circle cx="153.65" cy="46.49" r="2.74" fill="#F2B300"/><circle cx="191.00" cy="70.19" r="2.73" fill="#F2B300"/><circle cx="211.73" cy="145.00" r="2.72" fill="#F2B300"/><circle cx="96.20" cy="207.64" r="2.71" fill="#F2B300"/><circle cx="43.20" cy="113.48" r="2.69" fill="#F2B300"/><circle cx="168.07" cy="51.87" r="2.69" fill="#F2B300"/><circle cx="77.53" cy="197.80" r="2.68" fill="#F2B300"/><circle cx="41.68" cy="127.78" r="2.67" fill="#F2B300"/><circle cx="70.82" cy="192.74" r="2.66" fill="#F2B300"/><circle cx="42.20" cy="138.63" r="2.66" fill="#F2B300"/><circle cx="161.29" cy="207.90" r="2.64" fill="#F2B300"/><circle cx="46.19" cy="99.23" r="2.63" fill="#F2B300"/><circle cx="205.67" cy="165.38" r="2.63" fill="#F2B300"/><circle cx="52.87" cy="171.46" r="2.63" fill="#F2B300"/><circle cx="87.38" cy="51.21" r="2.62" fill="#F2B300"/><circle cx="113.22" cy="42.62" r="2.62" fill="#F2B300"/><circle cx="144.56" cy="213.34" r="2.61" fill="#F2B300"/><circle cx="88.34" cy="115.03" r="2.60" fill="#F2B300"/><circle cx="143.77" cy="42.27" r="2.60" fill="#F2B300"/><circle cx="128.01" cy="40.45" r="2.57" fill="#F2B300"/><circle cx="213.67" cy="110.05" r="2.56" fill="#F2B300"/><circle cx="83.63" cy="203.50" r="2.56" fill="#F2B300"/><circle cx="215.62" cy="122.89" r="2.54" fill="#F2B300"/><circle cx="215.74" cy="132.18" r="2.54" fill="#F2B300"/><circle cx="206.46" cy="88.45" r="2.54" fill="#F2B300"/><circle cx="174.17" cy="202.92" r="2.52" fill="#F2B300"/><circle cx="202.82" cy="174.41" r="2.52" fill="#F2B300"/><circle cx="68.14" cy="63.24" r="2.51" fill="#F2B300"/><circle cx="44.01" cy="155.24" r="2.50" fill="#F2B300"/><circle cx="197.09" cy="183.08" r="2.49" fill="#F2B300"/><circle cx="102.60" cy="212.73" r="2.49" fill="#F2B300"/><circle cx="78.92" cy="54.23" r="2.48" fill="#F2B300"/><circle cx="186.21" cy="61.25" r="2.48" fill="#F2B300"/><circle cx="55.43" cy="77.08" r="2.48" fill="#F2B300"/><circle cx="190.12" cy="191.17" r="2.47" fill="#F2B300"/><circle cx="155.59" cy="212.26" r="2.47" fill="#F2B300"/><circle cx="64.03" cy="189.69" r="2.45" fill="#F2B300"/><circle cx="213.39" cy="152.81" r="2.45" fill="#F2B300"/><circle cx="197.75" cy="72.54" r="2.43" fill="#F2B300"/><circle cx="56.44" cy="181.21" r="2.43" fill="#F2B300"/><circle cx="49.38" cy="85.48" r="2.42" fill="#F2B300"/><circle cx="106.26" cy="41.25" r="2.41" fill="#F2B300"/><circle cx="41.12" cy="106.40" r="2.40" fill="#F2B300"/><circle cx="110.91" cy="215.83" r="2.40" fill="#F2B300"/><circle cx="210.94" cy="94.33" r="2.40" fill="#F2B300"/><circle cx="216.84" cy="139.01" r="2.40" fill="#F2B300"/><circle cx="130.62" cy="217.49" r="2.40" fill="#F2B300"/><circle cx="47.34" cy="167.13" r="2.39" fill="#F2B300"/><circle cx="176.36" cy="52.51" r="2.39" fill="#F2B300"/><circle cx="38.60" cy="119.05" r="2.38" fill="#F2B300"/><circle cx="89.43" cy="208.88" r="2.37" fill="#F2B300"/><circle cx="161.33" cy="44.50" r="2.37" fill="#F2B300"/><circle cx="99.39" cy="42.48" r="2.35" fill="#F2B300"/><circle cx="182.25" cy="200.10" r="2.34" fill="#F2B300"/><circle cx="168.52" cy="208.67" r="2.33" fill="#F2B300"/><circle cx="120.95" cy="218.45" r="2.30" fill="#F2B300"/><circle cx="44.22" cy="92.75" r="2.29" fill="#F2B300"/><circle cx="119.99" cy="37.46" r="2.29" fill="#F2B300"/><circle cx="150.83" cy="40.27" r="2.28" fill="#F2B300"/><circle cx="37.23" cy="133.76" r="2.28" fill="#F2B300"/><circle cx="90.40" cy="45.00" r="2.27" fill="#F2B300"/><circle cx="206.35" cy="81.50" r="2.27" fill="#F2B300"/><circle cx="39.33" cy="149.35" r="2.26" fill="#F2B300"/><circle cx="215.82" cy="103.45" r="2.26" fill="#F2B300"/><circle cx="137.62" cy="37.19" r="2.25" fill="#F2B300"/><circle cx="139.78" cy="218.52" r="2.25" fill="#F2B300"/><circle cx="57.29" cy="69.97" r="2.24" fill="#F2B300"/><circle cx="218.60" cy="117.03" r="2.23" fill="#F2B300"/><circle cx="91.29" cy="109.09" r="2.23" fill="#F2B300"/><circle cx="183.20" cy="54.82" r="2.22" fill="#F2B300"/><circle cx="70.84" cy="199.72" r="2.22" fill="#F2B300"/><circle cx="71.85" cy="55.29" r="2.21" fill="#F2B300"/><circle cx="193.09" cy="63.14" r="2.20" fill="#F2B300"/><circle cx="203.50" cy="75.51" r="2.20" fill="#F2B300"/><circle cx="212.91" cy="163.24" r="2.19" fill="#F2B300"/><circle cx="60.89" cy="64.80" r="2.18" fill="#F2B300"/><circle cx="150.84" cy="217.24" r="2.18" fill="#F2B300"/><circle cx="50.30" cy="177.90" r="2.16" fill="#F2B300"/><circle cx="196.68" cy="189.66" r="2.16" fill="#F2B300"/><circle cx="218.40" cy="145.47" r="2.16" fill="#F2B300"/><circle cx="42.15" cy="162.16" r="2.16" fill="#F2B300"/><circle cx="76.79" cy="204.94" r="2.16" fill="#F2B300"/><circle cx="169.27" cy="45.33" r="2.15" fill="#F2B300"/><circle cx="36.62" cy="142.99" r="2.14" fill="#F2B300"/><circle cx="35.40" cy="125.09" r="2.14" fill="#F2B300"/><circle cx="203.96" cy="180.89" r="2.14" fill="#F2B300"/><circle cx="188.90" cy="197.76" r="2.14" fill="#F2B300"/><circle cx="36.61" cy="112.30" r="2.13" fill="#F2B300"/><circle cx="95.20" cy="214.70" r="2.13" fill="#F2B300"/><circle cx="209.93" cy="171.34" r="2.13" fill="#F2B300"/><circle cx="153.49" cy="88.45" r="2.13" fill="#F2B300"/><circle cx="64.89" cy="196.04" r="2.12" fill="#F2B300"/><circle cx="57.01" cy="187.82" r="2.12" fill="#F2B300"/><circle cx="49.19" cy="78.83" r="2.12" fill="#F2B300"/><circle cx="110.48" cy="36.52" r="2.10" fill="#F2B300"/><circle cx="81.93" cy="46.98" r="2.09" fill="#F2B300"/><circle cx="131.82" cy="35.15" r="2.09" fill="#F2B300"/><circle cx="162.23" cy="214.67" r="2.09" fill="#F2B300"/><circle cx="39.11" cy="99.64" r="2.09" fill="#F2B300"/><circle cx="221.25" cy="128.88" r="2.08" fill="#F2B300"/><circle cx="157.74" cy="39.21" r="2.05" fill="#F2B300"/><circle cx="179.89" cy="205.94" r="2.05" fill="#F2B300"/><circle cx="216.48" cy="97.25" r="2.05" fill="#F2B300"/><circle cx="125.86" cy="34.28" r="2.05" fill="#F2B300"/><circle cx="144.81" cy="35.59" r="2.03" fill="#F2B300"/><circle cx="198.56" cy="65.92" r="2.02" fill="#F2B300"/><circle cx="83.43" cy="210.77" r="2.02" fill="#F2B300"/><circle cx="105.64" cy="219.32" r="2.02" fill="#F2B300"/><circle cx="115.14" cy="220.39" r="2.01" fill="#F2B300"/><circle cx="212.47" cy="86.35" r="2.00" fill="#F2B300"/><circle cx="65.85" cy="57.35" r="2.00" fill="#F2B300"/><circle cx="220.19" cy="108.56" r="2.00" fill="#F2B300"/><circle cx="145.53" cy="220.56" r="2.00" fill="#F2B300"/><circle cx="126.28" cy="222.27" r="1.99" fill="#F2B300"/><circle cx="222.13" cy="135.57" r="1.98" fill="#F2B300"/><circle cx="175.14" cy="209.82" r="1.98" fill="#F2B300"/><circle cx="222.32" cy="122.98" r="1.98" fill="#F2B300"/><circle cx="43.05" cy="86.39" r="1.98" fill="#F2B300"/><circle cx="45.42" cy="174.19" r="1.97" fill="#F2B300"/><circle cx="37.27" cy="155.19" r="1.96" fill="#F2B300"/><circle cx="217.63" cy="158.44" r="1.96" fill="#F2B300"/><circle cx="75.55" cy="48.95" r="1.95" fill="#F2B300"/><circle cx="134.80" cy="222.60" r="1.95" fill="#F2B300"/><circle cx="175.97" cy="46.10" r="1.94" fill="#F2B300"/><circle cx="164.48" cy="108.41" r="1.94" fill="#F2B300"/><circle cx="99.64" cy="218.59" r="1.94" fill="#F2B300"/><circle cx="50.53" cy="72.97" r="1.94" fill="#F2B300"/><circle cx="194.55" cy="195.70" r="1.94" fill="#F2B300"/><circle cx="59.23" cy="193.65" r="1.93" fill="#F2B300"/><circle cx="190.22" cy="56.11" r="1.93" fill="#F2B300"/><circle cx="202.67" cy="186.84" r="1.93" fill="#F2B300"/><circle cx="93.33" cy="39.25" r="1.92" fill="#F2B300"/><circle cx="220.22" cy="151.64" r="1.91" fill="#F2B300"/><circle cx="102.57" cy="36.36" r="1.91" fill="#F2B300"/><circle cx="157.61" cy="218.52" r="1.91" fill="#F2B300"/><circle cx="147.34" cy="174.46" r="1.90" fill="#F2B300"/><circle cx="50.92" cy="184.35" r="1.90" fill="#F2B300"/><circle cx="35.15" cy="105.20" r="1.88" fill="#F2B300"/><circle cx="216.19" cy="90.86" r="1.87" fill="#F2B300"/><circle cx="168.50" cy="214.68" r="1.87" fill="#F2B300"/><circle cx="32.24" cy="130.03" r="1.87" fill="#F2B300"/><circle cx="88.56" cy="215.25" r="1.87" fill="#F2B300"/><circle cx="209.73" cy="177.93" r="1.86" fill="#F2B300"/><circle cx="164.63" cy="39.38" r="1.86" fill="#F2B300"/><circle cx="32.68" cy="116.92" r="1.86" fill="#F2B300"/><circle cx="116.32" cy="32.58" r="1.84" fill="#F2B300"/><circle cx="32.45" cy="138.49" r="1.84" fill="#F2B300"/><circle cx="41.29" cy="169.57" r="1.84" fill="#F2B300"/><circle cx="203.78" cy="68.64" r="1.83" fill="#F2B300"/><circle cx="223.34" cy="141.53" r="1.82" fill="#F2B300"/><circle cx="38.32" cy="92.86" r="1.82" fill="#F2B300"/><circle cx="182.02" cy="48.08" r="1.81" fill="#F2B300"/><circle cx="84.81" cy="41.69" r="1.81" fill="#F2B300"/><circle cx="186.92" cy="204.54" r="1.75" fill="#F2B300"/><circle cx="176.87" cy="116.17" r="1.75" fill="#F2B300"/><circle cx="60.32" cy="58.91" r="1.74" fill="#F2B300"/><circle cx="71.14" cy="205.53" r="1.73" fill="#F2B300"/><circle cx="43.66" cy="80.63" r="1.72" fill="#F2B300"/><circle cx="152.39" cy="34.40" r="1.70" fill="#F2B300"/><circle cx="33.28" cy="147.85" r="1.65" fill="#F2B300"/><circle cx="215.79" cy="168.54" r="1.65" fill="#F2B300"/><circle cx="211.83" cy="79.90" r="1.64" fill="#F2B300"/><circle cx="121.28" cy="224.36" r="1.62" fill="#F2B300"/><circle cx="136.72" cy="31.59" r="1.61" fill="#F2B300"/><circle cx="223.63" cy="113.29" r="1.61" fill="#F2B300"/><circle cx="78.01" cy="210.37" r="1.60" fill="#F2B300"/><circle cx="110.12" cy="222.41" r="1.59" fill="#F2B300"/><circle cx="54.33" cy="65.07" r="1.57" fill="#F2B300"/><circle cx="221.33" cy="102.28" r="1.56" fill="#F2B300"/><circle cx="121.29" cy="31.33" r="1.47" fill="#F2B300"/><circle cx="65.87" cy="201.87" r="1.40" fill="#F2B300"/><circle cx="67.24" cy="52.28" r="1.37" fill="#F2B300"/><circle cx="187.75" cy="51.46" r="1.31" fill="#F2B300"/><circle cx="96.62" cy="77.84" r="6.89" fill="#24211C"/><circle cx="91.26" cy="87.12" r="6.89" fill="#24211C"/><circle cx="85.90" cy="96.40" r="6.89" fill="#24211C"/><circle cx="80.55" cy="105.68" r="6.89" fill="#24211C"/><circle cx="159.30" cy="77.84" r="6.89" fill="#24211C"/><circle cx="164.66" cy="87.12" r="6.89" fill="#24211C"/><circle cx="170.02" cy="96.40" r="6.89" fill="#24211C"/><circle cx="175.37" cy="105.68" r="6.89" fill="#24211C"/><circle cx="127.96" cy="132.05" r="6.89" fill="#24211C"/><circle cx="127.96" cy="144.68" r="6.89" fill="#24211C"/><circle cx="127.96" cy="157.31" r="6.89" fill="#24211C"/><circle cx="127.96" cy="169.94" r="6.89" fill="#24211C"/></svg>`

export function exportToCSV(data: ExportData, filename: string) {
  const safe = (val: string | number) => {
    const text = String(val ?? "")
    return text.includes(",") ? `"${text.replace(/"/g, '""')}"` : text
  }

  const csvContent = [
    `"${data.title}"`,
    data.subtitle ? `"${data.subtitle}"` : "",
    "",
    data.headers.map(safe).join(","),
    ...data.rows.map((row) => row.map(safe).join(",")),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToPDF(data: ExportData, filename: string) {
  const win = window.open("", "_blank")
  if (!win) {
    alert("Please allow popups to export PDF")
    return
  }

  const generated = data.generatedAt ?? new Date()
  const dateStr = generated.toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const timeStr = generated.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })

  const tableRows = data.rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="border:1px solid #e5e7eb; padding:10px 8px; text-align:left; color:${GRIDALERT_TEXT}; font-size:13px;">${cell}</td>`
          )
          .join("")}</tr>`
    )
    .join("")

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>${data.title}</title>
        <style>
          body {
            font-family: "Inter", "Plus Jakarta Sans", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            padding: 36px;
            max-width: 1200px;
            margin: 0 auto;
            color: ${GRIDALERT_TEXT};
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid ${GRIDALERT_PRIMARY};
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .brand-name {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          h1 {
            margin: 10px 0 4px 0;
            font-size: 24px;
            color: ${GRIDALERT_TEXT};
          }
          .subtitle {
            color: #6b7280;
            font-size: 13px;
            margin: 0 0 4px 0;
          }
          .meta {
            text-align: right;
            font-size: 12px;
            color: #6b7280;
            line-height: 1.4;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th {
            background: ${GRIDALERT_PRIMARY};
            color: #fff;
            padding: 12px 10px;
            text-align: left;
            border: 1px solid #e5e7eb;
            font-size: 13px;
          }
          tr:nth-child(even) { background-color: #f9fafb; }
          tr:hover { background-color: #fff3e6; }
          .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
          @media print {
            body { padding: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">
              ${gridAlertLogoSvg}
              <span class="brand-name" style="color:${GRIDALERT_PRIMARY}">Wattle</span>
            </div>
            <h1>${data.title}</h1>
            ${data.subtitle ? `<p class="subtitle">${data.subtitle}</p>` : ""}
          </div>
          <div class="meta">
            <div>Generated: ${dateStr}</div>
            <div>${timeStr}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>${data.headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          <p>Wattle — outage report</p>
          <p>© ${new Date().getFullYear()} Arctiq Services · Wattle</p>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `

  win.document.write(html)
  win.document.close()
}
