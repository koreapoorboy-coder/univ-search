.result-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  margin-bottom: 6px;
}

button.stat-chip {
  width: auto !important;
  min-width: 84px;
  padding: 8px 12px;
  border: 0;
  border-radius: 999px;
  background: #f1f3f5;
  color: #222 !important;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: 0 0 auto;
}

button.stat-chip.stat-safe {
  background: #e8f7ee;
}

button.stat-chip.stat-fit {
  background: #eef4ff;
}

button.stat-chip.stat-up {
  background: #fff5e8;
}

button.stat-chip.is-active {
  outline: 2px solid #111;
  outline-offset: 1px;
}

@media (max-width: 768px) {
  button.stat-chip {
    min-width: 72px;
    padding: 7px 10px;
    font-size: 12px;
  }

  button.stat-chip.is-active {
    outline-width: 1px;
  }
}
