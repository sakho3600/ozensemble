import React from 'react';
import { withTheme } from 'styled-components';
import Timeline from './Timeline';
import DateDisplay from './DateDisplay';
import ConsoFeedDisplay from './ConsoFeedDisplay';
import ResultsFeedDisplay from './ResultsFeedDisplay';
import {
  FeedContainer,
  FeedDay,
  FeedDayContent,
  FeedBottomButton,
  FeedAddConsoTodayContainer,
  FeedAddConsoTodayButton,
} from './styles';
import NoConsoFeedDisplay from './NoConsoFeedDisplay';
import { isToday, datesAreEqual } from '../helpers/dateHelpers';
import { compose } from 'recompose';
import { connect } from 'react-redux';
import { getDrinksState, getDaysForFeed, removeDrink, setModalTimestamp } from './consoDuck';
import { useBackHandler } from '../helpers/customHooks';
import { TouchableWithoutFeedback } from 'react-native';
import CONSTANTS from '../reference/constants';
import matomo from '../matomo';

const computePosition = (drinksOfTheDay, drink) => {
  const sameTimeStamp = drinksOfTheDay.filter(d => d.timestamp === drink.timestamp);
  if (sameTimeStamp.length === 1) return 'alone';
  const position = sameTimeStamp.findIndex(d => d.id === drink.id);
  if (position === 0) return 'first';
  if (position === sameTimeStamp.length - 1) return 'last';
  return 'middle';
};

const computeShowButtons = (selected, position) => {
  if (!selected) return false;
  if (position === 'alone' || position === 'last') return true;
  return false;
};

const Feed = ({
  theme,
  days,
  drinks,
  setView,
  setModalTimestamp,
  setShowSetDrinksModal,
  removeDrink,
  showSetDrinksModal,
  hideFeed,
}) => {
  const [timestampSelected, setTimestampSelected] = React.useState(null);

  const setConsoSelectedRequest = timestamp => {
    if (timestampSelected === timestamp) {
      setTimestampSelected(null);
    } else {
      setTimestampSelected(timestamp);
    }
  };

  const addDrinksRequest = timestamp => {
    setModalTimestamp(timestamp);
    setShowSetDrinksModal(true);
  };

  const deleteDrinkRequest = timestamp => {
    setTimestampSelected(null);
    removeDrink(timestamp);
  };

  const onBackHandlerPressed = () => {
    if (timestampSelected !== null) {
      setTimestampSelected(null);
      return true;
    }
  };

  React.useEffect(() => {
    setTimestampSelected(null);
  }, [showSetDrinksModal]);

  useBackHandler(onBackHandlerPressed, !showSetDrinksModal);

  return (
    <React.Fragment>
      <FeedAddConsoTodayContainer zIndex={10}>
        <FeedAddConsoTodayButton
          content="Ajouter une consommation"
          onPress={async () => {
            addDrinksRequest(Date.now());
            await matomo.logConsoOpenAddScreen();
          }}
        />
      </FeedAddConsoTodayContainer>
      <TouchableWithoutFeedback onPress={() => setTimestampSelected(null)}>
        <FeedContainer hideFeed={hideFeed}>
          {!hideFeed &&
            days.map((day, index) => {
              const isFirst = index === 0;
              const isLast = index === days.length - 1;
              const drinksOfTheDay = drinks
                .filter(({ timestamp }) => datesAreEqual(timestamp, day))
                .sort((a, b) => (a > b ? -1 : 1));
              const noDrinks = !drinksOfTheDay.length;
              return (
                <FeedDay key={index}>
                  <Timeline first={isFirst} last={isLast} />
                  <FeedDayContent>
                    <DateDisplay day={day} />
                    {noDrinks && !isToday(day) && <NoConsoFeedDisplay selected={timestampSelected === null} />}
                    {drinksOfTheDay.map(drink => {
                      if (!drink.quantity) {
                        return null;
                      }
                      const position = computePosition(drinksOfTheDay, drink);
                      const selected = timestampSelected === drink.timestamp;
                      const showButtons = computeShowButtons(selected, position);
                      return (
                        <ConsoFeedDisplay
                          key={drink.id}
                          {...drink}
                          selected={selected}
                          showButtons={showButtons}
                          nothingSelected={timestampSelected === null}
                          onPress={setConsoSelectedRequest}
                          position={position}
                          updateDrinkRequest={async () => {
                            await matomo.logConsoUpdate();
                            addDrinksRequest(drink.timestamp);
                          }}
                          deleteDrinkRequest={async () => {
                            await matomo.logConsoDelete();
                            deleteDrinkRequest(drink.timestamp);
                          }}
                        />
                      );
                    })}
                    {!isToday(day) && (
                      <FeedBottomButton
                        color={theme.colors.title}
                        content="Ajouter une consommation"
                        withoutPadding
                        onPress={async () => {
                          addDrinksRequest(Date.parse(day));
                          await matomo.logConsoOpenAddScreen();
                        }}
                      />
                    )}
                    {isLast && (
                      <ResultsFeedDisplay
                        onPress={async () => {
                          setView(CONSTANTS.VIEW_QUIZZ);
                          matomo.logQuizzOpen(CONSTANTS.FROM_CONSO);
                        }}
                        selected={timestampSelected === null}
                      />
                    )}
                  </FeedDayContent>
                </FeedDay>
              );
            })}
        </FeedContainer>
      </TouchableWithoutFeedback>
    </React.Fragment>
  );
};

const makeStateToProps = () => state => ({
  drinks: getDrinksState(state),
  days: getDaysForFeed(state),
});

const dispatchToProps = {
  removeDrink,
  setModalTimestamp,
};

export default compose(
  connect(
    makeStateToProps,
    dispatchToProps
  ),
  withTheme
)(Feed);
