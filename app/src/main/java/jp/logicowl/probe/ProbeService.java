package jp.logicowl.probe;
import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.regex.*;
public final class ProbeService extends AccessibilityService {
  static final String OWL="de.goodowlapps.logicpuzzles";
  private TextView badge;private WindowManager wm;private long lastScan=0;private int count=0;
  @Override protected void onServiceConnected(){
    wm=(WindowManager)getSystemService(Context.WINDOW_SERVICE);
    store("ユーザー補助が起動しました。Logic Owlを開いてください。");
  }
  @Override public void onAccessibilityEvent(AccessibilityEvent e){
    if(e==null)return;
    CharSequence p=e.getPackageName();
    if(p==null||!OWL.contentEquals(p)){
      if(e.getEventType()==AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED)hide();
      return;
    }
    if(SystemClock.uptimeMillis()-lastScan<180)return;lastScan=SystemClock.uptimeMillis();count++;
    AccessibilityNodeInfo root=getRootInActiveWindow();
    ArrayList<String> text=new ArrayList<>();
    if(root!=null)walk(root,text,0,new int[]{0});
    String joined=android.text.TextUtils.join(" ",text);
    Matcher header=Pattern.compile("(?i)\\bPuzzle\\s*(\\d+)\\s*[·•.\\-]?\\s*(Easy|Medium|Hard|Extreme|Expert)\\b").matcher(joined);
    String no="未取得",diff="未取得";
    if(header.find()){no=header.group(1);diff=header.group(2);}
    boolean solved=Pattern.compile("(?i)\\bSolved\\s*!?").matcher(joined).find();
    Matcher time=Pattern.compile("(?i)\\bin\\s+(\\d{1,4}):(\\d{2})(?::(\\d{2}))?\\b").matcher(joined);
    String duration="未取得";
    if(solved&&time.find()){
      try {
        int a=Integer.parseInt(time.group(1)),b=Integer.parseInt(time.group(2));
        int seconds=time.group(3)==null?a*60+b:a*3600+b*60+Integer.parseInt(time.group(3));
        if(b<60&&seconds>0)duration=seconds+"秒";
      }catch(Exception ignored){}
    }
    StringBuilder report=new StringBuilder();
    report.append("Logic Owlイベント数: ").append(count).append("\n");
    report.append("画面ルート: ").append(root==null?"取得不可":"取得").append("\n");
    report.append("文字数: ").append(text.size()).append("\n");
    report.append("問題番号: ").append(no).append("\n");
    report.append("難易度: ").append(diff).append("\n");
    report.append("Solved!: ").append(solved?"検知":"未検知").append("\n");
    report.append("完答時間: ").append(duration).append("\n");
    report.append("\n--- 取得文字（最大30件） ---\n");
    for(int i=0;i<Math.min(30,text.size());i++){
      String v=text.get(i).replace('\n',' ');
      if(v.length()>85)v=v.substring(0,85)+"…";
      report.append(i+1).append(". ").append(v).append("\n");
    }
    store(report.toString());
    show(solved?"Solved! "+duration:"Puzzle "+no+" / "+diff+" / "+text.size()+"件");
  }
  private static void walk(AccessibilityNodeInfo n,ArrayList<String> strings,int depth,int[] cnt){
    if(n==null||depth>28||cnt[0]++>500||strings.size()>100)return;
    CharSequence t=n.getText(),d=n.getContentDescription();
    if(t!=null&&t.length()>0)strings.add(t.toString());
    if(d!=null&&d.length()>0&&(t==null||!d.toString().contentEquals(t)))strings.add(d.toString());
    for(int i=0;i<Math.min(n.getChildCount(),140);i++)walk(n.getChild(i),strings,depth+1,cnt);
  }
  private void store(String s){getSharedPreferences("probe",MODE_PRIVATE).edit().putString("report",s).apply();}
  private void show(String msg){
    try {
      if(wm==null)wm=(WindowManager)getSystemService(Context.WINDOW_SERVICE);
      if(badge==null){
        badge=new TextView(this);badge.setTextColor(Color.WHITE);badge.setTextSize(12);
        badge.setPadding(20,14,20,14);
        GradientDrawable bg=new GradientDrawable();bg.setColor(0xe633396c);bg.setCornerRadius(30);badge.setBackground(bg);
        WindowManager.LayoutParams lp=new WindowManager.LayoutParams(-2,-2,WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
          WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,PixelFormat.TRANSLUCENT);
        lp.gravity=Gravity.TOP|Gravity.END;lp.x=18;lp.y=150;wm.addView(badge,lp);
      }
      badge.setText("🦉 "+msg);
    }catch(Exception x){badge=null;store("表示失敗: "+x.getClass().getSimpleName());}
  }
  private void hide(){if(badge!=null&&wm!=null){try{wm.removeView(badge);}catch(Exception ignored){}badge=null;}}
  @Override public void onInterrupt(){hide();}
  @Override public void onDestroy(){hide();super.onDestroy();}
}