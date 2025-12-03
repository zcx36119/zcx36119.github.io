let currentLnglat = null;

// 初始化定位+搜索事件绑定
window.onload = function() {
  // 高德IP定位
  AMap.plugin('AMap.Geolocation', function() {
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: false,
      timeout: 10000,
      buttonPosition: 'RB'
    });

    geolocation.getCurrentPosition(function(status, result) {
      if (status === 'complete') {
        currentLnglat = [result.position.lng, result.position.lat];
        document.getElementById('locationStatus').textContent = `当前位置：${result.formattedAddress}`;
      } else {
        currentLnglat = [116.39748, 39.90882]; // 默认北京坐标
        document.getElementById('locationStatus').textContent = '定位失败，默认使用北京位置';
      }
    });
  });

  // 搜索按钮+回车事件
  document.getElementById('searchBtn').addEventListener('click', searchNearby);
  document.getElementById('searchInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') searchNearby();
  });
};

// 附近POI搜索核心逻辑
function searchNearby() {
  const keyword = document.getElementById('searchInput').value.trim();
  const resultList = document.getElementById('resultList');

  if (!keyword) {
    alert('请输入搜索关键词');
    return;
  }
  if (!currentLnglat) {
    alert('定位中，请稍后再试');
    return;
  }

  resultList.innerHTML = '<p class="status">正在搜索...</p>';

  AMap.plugin('AMap.PlaceSearch', function() {
    const placeSearch = new AMap.PlaceSearch({
      pageSize: 10,
      pageIndex: 1,
      type: '',
      city: '',
      radius: 3000 // 搜索半径3公里，可修改
    });

    placeSearch.searchNearBy(keyword, currentLnglat, function(status, result) {
      if (status === 'complete' && result.poiList && result.poiList.pois.length > 0) {
        resultList.innerHTML = '';
        result.poiList.pois.forEach(poi => {
          const distance = Math.round(poi.distance);
          const resultItem = document.createElement('div');
          resultItem.className = 'result-item';
          resultItem.innerHTML = `
            <h3>${poi.name}</h3>
            <p>${poi.address}</p>
            <p class="distance">距离：${distance}米</p>
          `;
          resultList.appendChild(resultItem);
        });
      } else {
        resultList.innerHTML = '<p class="status">未找到相关结果</p>';
      }
    });
  });
}